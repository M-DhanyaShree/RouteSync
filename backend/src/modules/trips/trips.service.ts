import { tripsRepository } from './trips.repository'
import { attendanceRepository } from '../attendance/attendance.repository'
import { groupsRepository } from '../groups/groups.repository'
import { AppError } from '../../middleware/error.middleware'
import { StartTripDto } from './trips.dto'
import { createOptimizer, calculateDistanceKm } from '../../shared/utils/routeOptimizer'
import { etaEngine } from '../../shared/utils/etaEngine'
import { broadcastToGroup, broadcastToTrip } from '../../shared/services/socket.service'
import { notificationService, Notifications } from '../../shared/services/notification.service'
import { prisma } from '../../config/database'
import { logger } from '../../config/logger'

export class TripsService {
  async startTrip(driverId: string, dto: StartTripDto) {
    // 1. Check if group has active trip
    const activeTrip = await tripsRepository.getActiveTripByGroup(dto.groupId)
    if (activeTrip) throw new AppError('An active trip already exists for this group', 400)

    const group = await groupsRepository.findById(dto.groupId)
    if (!group) throw new AppError('Group not found', 404)
    if (group.driverId !== driverId) throw new AppError('Only the driver can start the trip', 403)

    // 2. Lock attendance for today
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Create planned trip record first
    const trip = await tripsRepository.createTrip(driverId, dto)
    await attendanceRepository.lockForGroup(dto.groupId, today, trip.id)

    // 3. Get PRESENT students
    const todayAttendance = await attendanceRepository.findTodayForGroup(dto.groupId)
    const presentStudents = todayAttendance.filter((a: any) => a.status === 'PRESENT')

    if (presentStudents.length === 0) {
      await tripsRepository.updateTripStatus(trip.id, 'COMPLETED', { endedAt: new Date() })
      throw new AppError('No students marked present today', 400)
    }

    // 4. Gather pickup coordinates
    const stopsForOptimization = []
    for (const record of presentStudents) {
      // Find saved location or fallback to student profile pickup spot
      let loc = await prisma.location.findFirst({ where: { userId: record.studentId, isDefault: true } })
      if (!loc) {
        loc = await prisma.location.findFirst({ where: { userId: record.studentId } })
      }

      if (loc) {
        stopsForOptimization.push({
          studentId: record.studentId,
          name: record.student?.name || 'Student',
          phone: record.student?.phone,
          lat: loc.lat,
          lng: loc.lng,
          address: loc.address || 'Pickup Spot',
        })
      } else {
        // Fallback default coordinate slightly offset from driver origin
        stopsForOptimization.push({
          studentId: record.studentId,
          name: record.student?.name || 'Student',
          phone: record.student?.phone,
          lat: dto.startLat + (Math.random() - 0.5) * 0.02,
          lng: dto.startLng + (Math.random() - 0.5) * 0.02,
          address: 'Default Pickup Spot',
        })
      }
    }

    // 5. Optimize route using 2-Opt TSP
    const destinationLoc = dto.destinationId
      ? group.destinations.find((d: any) => d.id === dto.destinationId)
      : group.destinations?.[0] || { lat: dto.startLat + 0.04, lng: dto.startLng + 0.04, address: 'Campus Main Gate' }

    const optimizer = createOptimizer('2-opt')
    const optimizationResult = await optimizer.optimize({
      origin: { lat: dto.startLat, lng: dto.startLng },
      stops: stopsForOptimization,
      destination: { lat: destinationLoc.lat, lng: destinationLoc.lng },
    })

    // 6. Calculate ETAs
    const baseTime = new Date()
    const etas = await etaEngine.calculateETAs(
      { lat: dto.startLat, lng: dto.startLng },
      optimizationResult.orderedStops.map((s, idx) => ({ ...s, sequence: idx })),
      baseTime
    )

    // 7. Save stops
    const stopsToSave = optimizationResult.orderedStops.map((stop, idx) => {
      const etaObj = etas.find((e) => e.studentId === stop.studentId)
      return {
        ...stop,
        sequence: idx,
        plannedEta: etaObj ? etaObj.plannedEta : null,
      }
    })

    await tripsRepository.saveTripStops(trip.id, stopsToSave)

    // 8. Update Trip to ACTIVE
    await tripsRepository.updateTripStatus(trip.id, 'ACTIVE', {
      startedAt: baseTime,
      plannedDistanceKm: optimizationResult.totalDistanceKm,
    })

    await tripsRepository.recordEvent(trip.id, 'STARTED', { lat: dto.startLat, lng: dto.startLng })

    // Log initial driver location
    await tripsRepository.logLocation(trip.id, dto.startLat, dto.startLng)

    // 9. Notify and Broadcast
    broadcastToGroup(dto.groupId, 'trip:started', { tripId: trip.id, groupId: dto.groupId })

    // Notify all present students
    for (const p of presentStudents) {
      notificationService.send(Notifications.tripStarted(p.studentId, group.name, trip.id))
    }

    return this.getTrip(trip.id)
  }

  async updateStopStatus(
    tripId: string,
    stopId: string,
    driverId: string,
    status: 'ARRIVED' | 'PICKED_UP' | 'SKIPPED',
    actualLat?: number,
    actualLng?: number
  ) {
    const trip = await tripsRepository.getTripById(tripId)
    if (!trip) throw new AppError('Trip not found', 404)
    if (trip.driverId !== driverId) throw new AppError('Only the driver can update stop status', 403)
    if (trip.status !== 'ACTIVE') throw new AppError('Trip is not active', 400)

    const stop = await tripsRepository.getStop(stopId)
    if (!stop || stop.tripId !== tripId) throw new AppError('Stop not found in this trip', 404)

    const now = new Date()
    const updateData: any = { status }
    if (status === 'ARRIVED') updateData.actualArrival = now
    if (status === 'PICKED_UP') updateData.actualDeparture = now

    const updatedStop = await tripsRepository.updateStop(stopId, updateData)

    // Record Event
    await tripsRepository.recordEvent(tripId, `STOP_${status}`, {
      stopId,
      studentId: stop.studentId,
      lat: actualLat || stop.lat,
      lng: actualLng || stop.lng,
    })

    // Broadcast update
    broadcastToTrip(tripId, 'trip:stop_update', {
      tripId,
      stopId,
      studentId: stop.studentId,
      status,
      timestamp: now.toISOString(),
    })
    broadcastToGroup(trip.groupId, 'trip:stop_update', {
      tripId,
      stopId,
      studentId: stop.studentId,
      status,
      timestamp: now.toISOString(),
    })

    // If approaching next stop, notify the next student
    if (status === 'PICKED_UP' || status === 'SKIPPED') {
      const nextPendingStop = trip.stops.find((s: any) => s.sequence > stop.sequence && s.status === 'PENDING')
      if (nextPendingStop) {
        notificationService.send(Notifications.stopApproaching(nextPendingStop.studentId, 5, tripId))
      }
    }

    return updatedStop
  }

  async endTrip(tripId: string, driverId: string) {
    const trip = await tripsRepository.getTripById(tripId)
    if (!trip) throw new AppError('Trip not found', 404)
    if (trip.driverId !== driverId) throw new AppError('Only the driver can complete this trip', 403)
    if (trip.status !== 'ACTIVE') throw new AppError('Trip is not active', 400)

    const endedAt = new Date()
    let actualDurationMins = 0
    if (trip.startedAt) {
      actualDurationMins = Math.round((endedAt.getTime() - new Date(trip.startedAt).getTime()) / (1000 * 60))
    }

    // Mark remaining pending stops as completed or picked up
    for (const stop of trip.stops) {
      if (stop.status === 'PENDING' || stop.status === 'ARRIVED') {
        await tripsRepository.updateStop(stop.id, { status: 'PICKED_UP', actualDeparture: endedAt })
      }
    }

    // Update trip status
    const updated = await tripsRepository.updateTripStatus(tripId, 'COMPLETED', {
      endedAt,
      actualDurationMins,
      actualDistanceKm: trip.plannedDistanceKm || 12.5,
    })

    await tripsRepository.recordEvent(tripId, 'COMPLETED', { endedAt })

    // Broadcast to trip and group
    broadcastToTrip(tripId, 'trip:completed', { tripId, endedAt })
    broadcastToGroup(trip.groupId, 'trip:completed', { tripId, endedAt })

    // Send notifications to all students in trip
    for (const stop of trip.stops) {
      notificationService.send(Notifications.tripCompleted(stop.studentId, tripId))
    }

    return updated
  }

  async cancelTrip(tripId: string, driverId: string, reason: string) {
    const trip = await tripsRepository.getTripById(tripId)
    if (!trip) throw new AppError('Trip not found', 404)
    if (trip.driverId !== driverId) throw new AppError('Only the driver can cancel this trip', 403)

    const updated = await tripsRepository.updateTripStatus(tripId, 'CANCELLED', {
      endedAt: new Date(),
    })

    await tripsRepository.recordEvent(tripId, 'CANCELLED', { reason })

    broadcastToTrip(tripId, 'trip:cancelled', { tripId, reason })
    broadcastToGroup(trip.groupId, 'trip:cancelled', { tripId, reason })

    return updated
  }

  async triggerEmergency(tripId: string, driverId: string, lat: number, lng: number, reason: string) {
    const trip = await tripsRepository.getTripById(tripId)
    if (!trip) throw new AppError('Trip not found', 404)

    await tripsRepository.recordEvent(tripId, 'EMERGENCY', { lat, lng, reason })

    // Broadcast SOS alert
    broadcastToTrip(tripId, 'trip:emergency', { tripId, driverId, lat, lng, reason, timestamp: new Date().toISOString() })
    broadcastToGroup(trip.groupId, 'trip:emergency', {
      tripId,
      driverId,
      lat,
      lng,
      reason,
      timestamp: new Date().toISOString(),
    })

    logger.warn(`🚨 EMERGENCY TRIGGERED on trip ${tripId}: ${reason} at [${lat}, ${lng}]`)

    return { status: 'EMERGENCY_DISPATCHED', timestamp: new Date() }
  }

  async getActiveTripByGroup(groupId: string) {
    return tripsRepository.getActiveTripByGroup(groupId)
  }

  async getTrip(tripId: string) {
    return tripsRepository.getTripById(tripId)
  }

  async handleLocationUpdate(
    tripId: string,
    driverId: string,
    lat: number,
    lng: number,
    speed?: number,
    heading?: number
  ) {
    // Record to location logs for breadcrumb tracking & route inspector
    await tripsRepository.logLocation(tripId, lat, lng, speed, heading)

    // Broadcast location
    broadcastToTrip(tripId, 'location:update', {
      tripId,
      driverId,
      lat,
      lng,
      speed,
      heading,
      timestamp: new Date().toISOString(),
    })

    // Check geofence (500m proximity) to upcoming pending stops and trigger 2-minute alert
    try {
      const trip = await tripsRepository.getTripById(tripId)
      if (trip && trip.stops) {
        for (const stop of trip.stops) {
          if (stop.status === 'PENDING') {
            const distKm = calculateDistanceKm(lat, lng, stop.lat, stop.lng)
            if (distKm <= 0.5) {
              // Within 500m geofence!
              broadcastToTrip(tripId, 'trip:geofence_entered', {
                tripId,
                studentId: stop.studentId,
                stopId: stop.id,
                distanceMeters: Math.round(distKm * 1000),
              })
              break
            }
          }
        }
      }
    } catch {
      // Non-blocking
    }
  }

  async getTripsHistory(userId: string, role: string, page = 1, limit = 20) {
    let whereClause: any = {}
    if (role === 'DRIVER') {
      whereClause = { driverId: userId }
    } else if (role === 'STUDENT') {
      whereClause = { stops: { some: { studentId: userId } } }
    }
    return tripsRepository.getTripsHistory(whereClause, page, limit)
  }

  async getTripRouteComparison(tripId: string) {
    const [trip, logs] = await Promise.all([
      tripsRepository.getTripById(tripId),
      tripsRepository.getLocationLogs(tripId),
    ])

    if (!trip) throw new AppError('Trip not found', 404)

    return {
      tripId: trip.id,
      status: trip.status,
      plannedStops: trip.stops,
      plannedDistanceKm: trip.plannedDistanceKm,
      actualDistanceKm: trip.actualDistanceKm,
      actualDurationMins: trip.actualDurationMins,
      actualPathCoordinates: logs.map((l: any) => ({ lat: l.lat, lng: l.lng, time: l.recordedAt })),
    }
  }
}

export const tripsService = new TripsService()


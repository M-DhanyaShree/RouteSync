import { tripsRepository } from './trips.repository'
import { attendanceRepository } from '../attendance/attendance.repository'
import { groupsRepository } from '../groups/groups.repository'
import { AppError } from '../../middleware/error.middleware'
import { StartTripDto } from './trips.dto'
import { createOptimizer, calculateDistanceKm } from '../../shared/utils/routeOptimizer'
import { etaEngine } from '../../shared/utils/etaEngine'
import { broadcastToGroup, broadcastToTrip } from '../../shared/services/socket.service'
import { notificationService, Notifications } from '../../shared/services/notification.service'
import { orsService } from '../../shared/services/ors.service'
import { prisma } from '../../config/database'
import { logger } from '../../config/logger'

export class TripsService {
  async startTrip(driverId: string, dto: StartTripDto) {
    const activeTrip = await tripsRepository.getActiveTripByGroup(dto.groupId)
    if (activeTrip) throw new AppError('An active trip already exists for this group', 400)

    const group = await groupsRepository.findById(dto.groupId)
    if (!group) throw new AppError('Group not found', 404)
    if (group.driverId !== driverId) throw new AppError('Only the driver can start the trip', 403)

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const trip = await tripsRepository.createTrip(driverId, dto)
    await attendanceRepository.lockForGroup(dto.groupId, today, trip.id)

    const todayAttendance = await attendanceRepository.findTodayForGroup(dto.groupId)
    const presentStudents = todayAttendance.filter((a: any) => a.status === 'PRESENT')

    if (presentStudents.length === 0) {
      await tripsRepository.updateTripStatus(trip.id, 'COMPLETED', { endedAt: new Date() })
      throw new AppError('No students marked present today', 400)
    }

    const stopsForOptimization = []
    for (const record of presentStudents) {
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
        throw new AppError(`Student ${record.student?.name || record.studentId} has no saved pickup location. Cannot generate route.`, 400)
      }
    }

    const destinationLoc = dto.destinationId
      ? group.destinations.find((d: any) => d.id === dto.destinationId)
      : group.destinations?.[0]

    if (!destinationLoc) {
      throw new AppError('No destination configured for this group. Cannot generate route.', 400)
    }

    // Prepare coordinates for ORS Matrix
    const origin = { lat: dto.startLat, lng: dto.startLng }
    const destination = { lat: destinationLoc.lat, lng: destinationLoc.lng }
    const allCoords: [number, number][] = [
      [origin.lat, origin.lng],
      ...stopsForOptimization.map(s => [s.lat, s.lng] as [number, number]),
      [destination.lat, destination.lng]
    ]

    // Fetch matrix once
    const matrixResult = await orsService.getMatrix(allCoords)

    const optimizer = createOptimizer('2-opt')
    const optimizationResult = await optimizer.optimize({
      origin,
      stops: stopsForOptimization,
      destination,
      distanceMatrix: matrixResult.distances
    })

    const baseTime = new Date()
    const etas = await etaEngine.calculateETAs(
      origin,
      optimizationResult.orderedStops.map((s, idx) => ({ ...s, sequence: idx })),
      stopsForOptimization,
      matrixResult.durations,
      baseTime
    )

    // Fetch directions (polyline)
    const directionCoords: [number, number][] = [
      [origin.lat, origin.lng],
      ...optimizationResult.orderedStops.map(s => [s.lat, s.lng] as [number, number]),
      [destination.lat, destination.lng]
    ]
    const directionsResult = await orsService.getDirections(directionCoords)

    const stopsToSave = optimizationResult.orderedStops.map((stop, idx) => {
      const etaObj = etas.find((e) => e.studentId === stop.studentId)
      return {
        ...stop,
        sequence: idx,
        plannedEta: etaObj ? etaObj.plannedEta : null,
      }
    })

    await tripsRepository.saveTripStops(trip.id, stopsToSave)

    await tripsRepository.updateTripStatus(trip.id, 'ACTIVE', {
      startedAt: baseTime,
      plannedDistanceKm: directionsResult.distance / 1000,
      routePolyline: directionsResult.coordinates // Stored exactly as needed by frontend Leaflet
    })

    await tripsRepository.recordEvent(trip.id, 'STARTED', { lat: dto.startLat, lng: dto.startLng })
    await tripsRepository.logLocation(trip.id, dto.startLat, dto.startLng)

    broadcastToGroup(dto.groupId, 'trip:started', { tripId: trip.id, groupId: dto.groupId })

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

    await tripsRepository.recordEvent(tripId, `STOP_${status}`, {
      stopId,
      studentId: stop.studentId,
      lat: actualLat || stop.lat,
      lng: actualLng || stop.lng,
    })

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

    for (const stop of trip.stops) {
      if (stop.status === 'PENDING' || stop.status === 'ARRIVED') {
        await tripsRepository.updateStop(stop.id, { status: 'PICKED_UP', actualDeparture: endedAt })
      }
    }

    const updated = await tripsRepository.updateTripStatus(tripId, 'COMPLETED', {
      endedAt,
      actualDurationMins,
      actualDistanceKm: trip.plannedDistanceKm || 12.5,
    })

    await tripsRepository.recordEvent(tripId, 'COMPLETED', { endedAt })

    broadcastToTrip(tripId, 'trip:completed', { tripId, endedAt })
    broadcastToGroup(trip.groupId, 'trip:completed', { tripId, endedAt })

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
    await tripsRepository.logLocation(tripId, lat, lng, speed, heading)

    broadcastToTrip(tripId, 'location:update', {
      tripId,
      driverId,
      lat,
      lng,
      speed,
      heading,
      timestamp: new Date().toISOString(),
    })

    try {
      const trip = await tripsRepository.getTripById(tripId)
      if (trip && trip.stops) {
        for (const stop of trip.stops) {
          if (stop.status === 'PENDING') {
            const distKm = calculateDistanceKm(lat, lng, stop.lat, stop.lng)
            
            // Geofence trigger
            if (distKm <= 0.5) {
              broadcastToTrip(tripId, 'trip:geofence_entered', {
                tripId,
                studentId: stop.studentId,
                stopId: stop.id,
                distanceMeters: Math.round(distKm * 1000),
              })
            }

            // ETA based triggers for 5-min and 2-min arrivals
            const etaMinutes = etaEngine.estimateRemainingETA(lat, lng, stop.lat, stop.lng)
            
            if (etaMinutes <= 5 && !stop.notified5min) {
              notificationService.send({
                userId: stop.studentId,
                title: 'Van Approaching',
                body: `Your van is arriving in approximately ${etaMinutes} minutes. Driver: ${trip.driver?.name || 'Your driver'}.`,
                type: 'ARRIVAL_WARNING_5MIN',
                metadata: { tripId, studentId: stop.studentId, etaMinutes, driverName: trip.driver?.name }
              })
              await tripsRepository.updateStop(stop.id, { notified5min: true })
            }

            if (etaMinutes <= 2 && !stop.notified2min) {
              notificationService.send({
                userId: stop.studentId,
                title: 'Van Arriving Now',
                body: `Your van is arriving in less than ${etaMinutes} minutes. Please step outside. Driver: ${trip.driver?.name || 'Your driver'}.`,
                type: 'ARRIVAL_WARNING_2MIN',
                metadata: { tripId, studentId: stop.studentId, etaMinutes, driverName: trip.driver?.name }
              })
              await tripsRepository.updateStop(stop.id, { notified2min: true })
            }
            
            // Only notify the very next pending stop, then break
            break
          }
        }
      }
    } catch (err) {
      logger.error('Error during live tracking notification generation:', err)
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

  async handleLateAbsence(groupId: string, studentId: string) {
    const activeTrip = await tripsRepository.getActiveTripByGroup(groupId)
    if (!activeTrip) return null

    const stop = activeTrip.stops?.find((s: any) => s.studentId === studentId)
    if (!stop) return null
    if (stop.status !== 'PENDING') return null

    await tripsRepository.updateStop(stop.id, { status: 'SKIPPED' })
    await tripsRepository.recordEvent(activeTrip.id, 'LATE_ABSENCE_SKIPPED', {
      studentId,
      stopId: stop.id,
      reason: 'Student informed late absence',
    })

    const remainingPendingStops = (activeTrip.stops || []).filter((s: any) => s.studentId !== studentId && s.status === 'PENDING')
    const completedStops = (activeTrip.stops || []).filter((s: any) => s.status === 'PICKED_UP' || s.status === 'ARRIVED')

    const lastVisited = completedStops.length > 0 ? completedStops[completedStops.length - 1] : { lat: activeTrip.startLat, lng: activeTrip.startLng }
    
    // We shouldn't use fallback here either if we want to be strict, but activeTrip should have a destination
    if (!activeTrip.destination) {
      logger.warn('Recalculation failed: Trip has no destination')
      return activeTrip
    }

    const destinationLoc = { lat: activeTrip.destination.lat, lng: activeTrip.destination.lng }

    let reorderedStops = remainingPendingStops
    let etas: any[] = []
    
    if (remainingPendingStops.length > 0) {
      const origin = { lat: lastVisited.lat, lng: lastVisited.lng }
      
      const allCoords: [number, number][] = [
        [origin.lat, origin.lng],
        ...remainingPendingStops.map((s: any) => [s.lat, s.lng] as [number, number]),
        [destinationLoc.lat, destinationLoc.lng]
      ]
      
      try {
        const matrixResult = await orsService.getMatrix(allCoords)
        
        const optimizer = createOptimizer('2-opt')
        const optResult = await optimizer.optimize({
          origin,
          stops: remainingPendingStops,
          destination: destinationLoc,
          distanceMatrix: matrixResult.distances
        })
        reorderedStops = optResult.orderedStops
        
        const baseTime = new Date()
        etas = await etaEngine.calculateETAs(
          origin,
          reorderedStops.map((s: any, idx: number) => ({ ...s, sequence: completedStops.length + idx })),
          remainingPendingStops,
          matrixResult.durations,
          baseTime
        )
        
        // Update polyline geometry for remaining trip
        const directionCoords: [number, number][] = [
          [origin.lat, origin.lng],
          ...reorderedStops.map((s: any) => [s.lat, s.lng] as [number, number]),
          [destinationLoc.lat, destinationLoc.lng]
        ]
        const directionsResult = await orsService.getDirections(directionCoords)
        
        await tripsRepository.updateTripStatus(activeTrip.id, activeTrip.status, {
           routePolyline: directionsResult.coordinates
        })
      } catch (err) {
        logger.error('Failed to recalculate route with ORS:', err)
        // Fallback to existing logic if ORS fails during live route so we don't crash
      }
    }

    for (let i = 0; i < reorderedStops.length; i++) {
      const st = reorderedStops[i]
      const etaObj = etas.find((e: any) => e.studentId === st.studentId)
      await tripsRepository.updateStop(st.id, {
        sequence: completedStops.length + i,
        plannedEta: etaObj ? etaObj.plannedEta : null,
      })
    }

    const updatedTrip = await tripsRepository.getTripById(activeTrip.id)
    broadcastToTrip(activeTrip.id, 'trip:stop_update', {
      tripId: activeTrip.id,
      stopId: stop.id,
      studentId,
      status: 'SKIPPED',
      recalculated: true,
      updatedTrip,
    })
    broadcastToGroup(groupId, 'trip:stop_update', {
      tripId: activeTrip.id,
      stopId: stop.id,
      studentId,
      status: 'SKIPPED',
      recalculated: true,
      updatedTrip,
    })
    broadcastToTrip(activeTrip.id, 'trip:recalculated', { tripId: activeTrip.id, updatedTrip })
    broadcastToGroup(groupId, 'trip:recalculated', { tripId: activeTrip.id, updatedTrip })

    notificationService.send({
      userId: activeTrip.driverId,
      type: 'TRIP_UPDATE',
      title: 'Route Re-Optimized: Late Absence',
      body: `A student reported absent. Stop skipped and route dynamically recalculated.`,
      metadata: { tripId: activeTrip.id, studentId },
    })

    return updatedTrip
  }
}

export const tripsService = new TripsService()

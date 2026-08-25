import { tripsRepository } from './trips.repository'
import { attendanceRepository } from '../attendance/attendance.repository'
import { groupsRepository } from '../groups/groups.repository'
import { AppError } from '../../middleware/error.middleware'
import { StartTripDto } from './trips.dto'
import { createOptimizer } from '../../shared/utils/routeOptimizer'
import { etaEngine } from '../../shared/utils/etaEngine'
import { broadcastToGroup, broadcastToTrip } from '../../shared/services/socket.service'
import { notificationService, Notifications } from '../../shared/services/notification.service'

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
    today.setHours(0,0,0,0)
    
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
      const loc = await prisma.location.findFirst({ where: { userId: record.studentId, isDefault: true }})
      if (loc) {
        stopsForOptimization.push({
          studentId: record.studentId,
          name: record.student?.name || 'Student',
          lat: loc.lat,
          lng: loc.lng,
          address: loc.address
        })
      }
    }

    // 5. Optimize route
    const destinationLoc = dto.destinationId 
      ? group.destinations.find((d: any) => d.id === dto.destinationId) 
      : group.destinations[0]

    if (!destinationLoc) throw new AppError('No destination configured for group', 400)

    const optimizer = createOptimizer()
    const optimizationResult = await optimizer.optimize({
      origin: { lat: dto.startLat, lng: dto.startLng },
      stops: stopsForOptimization,
      destination: { lat: destinationLoc.lat, lng: destinationLoc.lng }
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
      const etaObj = etas.find(e => e.studentId === stop.studentId)
      return {
        ...stop,
        sequence: idx,
        plannedEta: etaObj ? etaObj.plannedEta : null
      }
    })
    
    await tripsRepository.saveTripStops(trip.id, stopsToSave)

    // 8. Update Trip to ACTIVE
    const updatedTrip = await tripsRepository.updateTripStatus(trip.id, 'ACTIVE', { 
      startedAt: baseTime,
      plannedDistanceKm: optimizationResult.totalDistanceKm
    })

    await tripsRepository.recordEvent(trip.id, 'STARTED', { lat: dto.startLat, lng: dto.startLng })

    // 9. Notify and Broadcast
    broadcastToGroup(dto.groupId, 'trip:started', { tripId: trip.id })
    
    // Notify all present students
    for(const p of presentStudents) {
      notificationService.send(Notifications.tripStarted(p.studentId, group.name, trip.id))
    }

    return this.getTrip(trip.id)
  }

  async getActiveTripByGroup(groupId: string) {
    return tripsRepository.getActiveTripByGroup(groupId)
  }

  async getTrip(tripId: string) {
    return tripsRepository.getTripById(tripId)
  }

  async handleLocationUpdate(tripId: string, driverId: string, lat: number, lng: number) {
    // Save event
    await tripsRepository.recordEvent(tripId, 'LOCATION_UPDATE', { lat, lng })
    
    // Broadcast location
    broadcastToTrip(tripId, 'location:update', { tripId, driverId, lat, lng, timestamp: new Date().toISOString() })
    
    // Optional: Recalculate ETA if significant time has passed or distance changed
  }
}

export const tripsService = new TripsService()
// Dummy prisma import for loc in step 4
import { prisma } from '../../config/database'

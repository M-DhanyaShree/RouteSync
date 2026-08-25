import { prisma } from '../../config/database'
import { StartTripDto } from './trips.dto'
import { TripStatus } from '../../shared/types/api.types'

export class TripsRepository {
  async createTrip(driverId: string, dto: StartTripDto) {
    return prisma.trip.create({
      data: {
        groupId: dto.groupId,
        driverId,
        destinationId: dto.destinationId,
        status: 'PLANNED',
        startLat: dto.startLat,
        startLng: dto.startLng,
      },
    })
  }

  async saveTripStops(tripId: string, stops: any[]) {
    return prisma.tripStop.createMany({
      data: stops.map((stop, index) => ({
        tripId,
        studentId: stop.studentId,
        sequence: stop.sequence || index,
        lat: stop.lat,
        lng: stop.lng,
        address: stop.address,
        plannedEta: stop.plannedEta,
        status: 'PENDING',
      })),
    })
  }

  async updateTripStatus(tripId: string, status: TripStatus, data: any = {}) {
    return prisma.trip.update({
      where: { id: tripId },
      data: {
        status,
        ...data,
      },
    })
  }

  async getActiveTripByGroup(groupId: string) {
    return prisma.trip.findFirst({
      where: { groupId, status: 'ACTIVE' },
      include: {
        stops: { orderBy: { sequence: 'asc' } },
        driver: { select: { id: true, name: true, phone: true } },
        destination: true,
      },
    })
  }
  
  async getTripById(tripId: string) {
    return prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        stops: { orderBy: { sequence: 'asc' } },
        driver: { select: { id: true, name: true, phone: true } },
        destination: true,
      }
    })
  }

  async getStop(stopId: string) {
    return prisma.tripStop.findUnique({ where: { id: stopId } })
  }

  async updateStop(stopId: string, data: any) {
    return prisma.tripStop.update({
      where: { id: stopId },
      data,
    })
  }

  async recordEvent(tripId: string, type: any, data: any = {}) {
    return prisma.tripEvent.create({
      data: {
        tripId,
        type,
        ...data,
      },
    })
  }

  async logLocation(tripId: string, lat: number, lng: number, speed?: number, heading?: number) {
    try {
      return await prisma.locationLog.create({
        data: {
          tripId,
          lat,
          lng,
          speed,
          heading,
        },
      })
    } catch {
      // Non-blocking log
      return null
    }
  }

  async getLocationLogs(tripId: string) {
    return prisma.locationLog.findMany({
      where: { tripId },
      orderBy: { recordedAt: 'asc' },
    })
  }

  async getTripsHistory(whereClause: any, page = 1, limit = 20) {
    const skip = (page - 1) * limit
    const [trips, total] = await Promise.all([
      prisma.trip.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          stops: { orderBy: { sequence: 'asc' } },
          driver: { select: { id: true, name: true, phone: true } },
          destination: true,
        },
      }),
      prisma.trip.count({ where: whereClause }),
    ])

    return { trips, total, page, limit, totalPages: Math.ceil(total / limit) }
  }

  async getAllActiveTrips() {
    return prisma.trip.findMany({
      where: { status: 'ACTIVE' },
      include: {
        stops: { orderBy: { sequence: 'asc' } },
        driver: { select: { id: true, name: true, phone: true } },
        destination: true,
      },
    })
  }
}

export const tripsRepository = new TripsRepository()


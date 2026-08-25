import { prisma } from '../../config/database'
import { StartTripDto } from './trips.dto'
import { TripStatus } from '@prisma/client'

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
}

export const tripsRepository = new TripsRepository()

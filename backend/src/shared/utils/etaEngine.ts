import { calculateDistanceKm } from './routeOptimizer'

export interface StopWithSequence {
  studentId: string
  lat: number
  lng: number
  sequence: number
  [key: string]: any
}

export interface StopETA {
  studentId: string
  sequence: number
  plannedEta: Date
  durationMinutes: number
}

export class ETAEngine {
  // Average urban speed: ~25 km/h + 2 minutes per stop dwell time
  private averageSpeedKmh = 25
  private stopDwellMinutes = 2

  async calculateETAs(
    origin: { lat: number; lng: number },
    orderedStops: StopWithSequence[],
    baseTime: Date = new Date()
  ): Promise<StopETA[]> {
    let currentLat = origin.lat
    let currentLng = origin.lng
    let cumulativeMinutes = 0
    const results: StopETA[] = []

    for (const stop of orderedStops) {
      const distanceKm = calculateDistanceKm(currentLat, currentLng, stop.lat, stop.lng)
      const travelTimeMinutes = (distanceKm / this.averageSpeedKmh) * 60
      cumulativeMinutes += travelTimeMinutes + this.stopDwellMinutes

      const etaTime = new Date(baseTime.getTime() + cumulativeMinutes * 60 * 1000)

      results.push({
        studentId: stop.studentId,
        sequence: stop.sequence,
        plannedEta: etaTime,
        durationMinutes: Math.round(cumulativeMinutes),
      })

      currentLat = stop.lat
      currentLng = stop.lng
    }

    return results
  }
}

export const etaEngine = new ETAEngine()

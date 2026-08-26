import { calculateDistanceKm, StopPoint } from './routeOptimizer'

export interface StopWithSequence extends StopPoint {
  sequence: number
}

export interface StopETA {
  studentId: string
  sequence: number
  plannedEta: Date
  durationMinutes: number
}

export class ETAEngine {
  private averageSpeedKmh = 25
  private stopDwellMinutes = 2

  // Helper to get duration from matrix or fallback to Haversine speed estimate
  private getDurationMinutes(
    matrix: number[][] | undefined,
    fromIdx: number,
    toIdx: number,
    fromLat: number,
    fromLng: number,
    toLat: number,
    toLng: number
  ): number {
    if (matrix && matrix[fromIdx] && matrix[fromIdx][toIdx] !== undefined) {
      // ORS duration is in seconds
      return matrix[fromIdx][toIdx] / 60
    }
    const distanceKm = calculateDistanceKm(fromLat, fromLng, toLat, toLng)
    return (distanceKm / this.averageSpeedKmh) * 60
  }

  async calculateETAs(
    origin: { lat: number; lng: number },
    orderedStops: StopWithSequence[],
    originalStops: StopPoint[],
    durationMatrix?: number[][],
    baseTime: Date = new Date()
  ): Promise<StopETA[]> {
    let currentLat = origin.lat
    let currentLng = origin.lng
    let currentMatrixIdx = 0
    let cumulativeMinutes = 0
    const results: StopETA[] = []

    for (const stop of orderedStops) {
      // Find original index (1-based because 0 is origin)
      const toMatrixIdx = originalStops.findIndex(s => s.studentId === stop.studentId) + 1
      
      const travelTimeMinutes = this.getDurationMinutes(
        durationMatrix,
        currentMatrixIdx,
        toMatrixIdx,
        currentLat,
        currentLng,
        stop.lat,
        stop.lng
      )
      
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
      currentMatrixIdx = toMatrixIdx
    }

    return results
  }
  
  // Live tracking estimation based on remaining distance
  estimateRemainingETA(
    currentLat: number,
    currentLng: number,
    stopLat: number,
    stopLng: number,
    baseTime: Date = new Date()
  ): number {
    // During live tracking we use fallback Haversine speed to avoid spamming ORS API per GPS tick
    const distanceKm = calculateDistanceKm(currentLat, currentLng, stopLat, stopLng)
    const travelTimeMinutes = (distanceKm / this.averageSpeedKmh) * 60
    return Math.round(travelTimeMinutes)
  }
}

export const etaEngine = new ETAEngine()

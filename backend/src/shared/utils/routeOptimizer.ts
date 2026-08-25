// Haversine distance in km
export function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371 // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

export interface StopPoint {
  studentId: string
  name: string
  lat: number
  lng: number
  address: string
  [key: string]: any
}

export interface OptimizationInput {
  origin: { lat: number; lng: number }
  stops: StopPoint[]
  destination: { lat: number; lng: number }
}

export interface OptimizationResult {
  orderedStops: StopPoint[]
  totalDistanceKm: number
}

export class RouteOptimizer {
  async optimize(input: OptimizationInput): Promise<OptimizationResult> {
    const { origin, stops, destination } = input

    if (stops.length === 0) {
      const directDist = calculateDistanceKm(origin.lat, origin.lng, destination.lat, destination.lng)
      return { orderedStops: [], totalDistanceKm: Math.round(directDist * 10) / 10 }
    }

    // Nearest-neighbor heuristic for TSP ordering from origin to destination
    const unvisited = [...stops]
    const ordered: StopPoint[] = []
    let currentLat = origin.lat
    let currentLng = origin.lng
    let totalDist = 0

    while (unvisited.length > 0) {
      let nearestIdx = 0
      let minDistance = Infinity

      for (let i = 0; i < unvisited.length; i++) {
        const d = calculateDistanceKm(currentLat, currentLng, unvisited[i].lat, unvisited[i].lng)
        if (d < minDistance) {
          minDistance = d
          nearestIdx = i
        }
      }

      const nextStop = unvisited.splice(nearestIdx, 1)[0]
      ordered.push(nextStop)
      totalDist += minDistance
      currentLat = nextStop.lat
      currentLng = nextStop.lng
    }

    // Add distance to destination
    totalDist += calculateDistanceKm(currentLat, currentLng, destination.lat, destination.lng)

    return {
      orderedStops: ordered,
      totalDistanceKm: Math.round(totalDist * 10) / 10,
    }
  }
}

export function createOptimizer() {
  return new RouteOptimizer()
}

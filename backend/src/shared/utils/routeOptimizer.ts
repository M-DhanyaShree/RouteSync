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
  phone?: string
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
  algorithm: 'nearest-neighbor' | '2-opt' | 'vrp-solver'
}

/**
 * Pluggable Route Optimizer Interface (Phase 3 Architecture)
 * Allows swapping algorithms with Google OR-Tools or custom VRP solvers
 */
export interface IRouteOptimizer {
  optimize(input: OptimizationInput): Promise<OptimizationResult>
}

/**
 * Phase 1: Nearest Neighbor Heuristic
 */
export class NearestNeighborOptimizer implements IRouteOptimizer {
  async optimize(input: OptimizationInput): Promise<OptimizationResult> {
    const { origin, stops, destination } = input

    if (stops.length === 0) {
      const directDist = calculateDistanceKm(origin.lat, origin.lng, destination.lat, destination.lng)
      return { orderedStops: [], totalDistanceKm: Math.round(directDist * 10) / 10, algorithm: 'nearest-neighbor' }
    }

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

    totalDist += calculateDistanceKm(currentLat, currentLng, destination.lat, destination.lng)

    return {
      orderedStops: ordered,
      totalDistanceKm: Math.round(totalDist * 10) / 10,
      algorithm: 'nearest-neighbor',
    }
  }
}

/**
 * Phase 2: 2-Opt Heuristic Route Optimizer
 * Refines the Nearest-Neighbor sequence by reversing pairs of edges to eliminate route crossings.
 */
export class TwoOptRouteOptimizer implements IRouteOptimizer {
  private calculateTotalTourDistance(
    origin: { lat: number; lng: number },
    stops: StopPoint[],
    destination: { lat: number; lng: number }
  ): number {
    if (stops.length === 0) {
      return calculateDistanceKm(origin.lat, origin.lng, destination.lat, destination.lng)
    }

    let dist = calculateDistanceKm(origin.lat, origin.lng, stops[0].lat, stops[0].lng)
    for (let i = 0; i < stops.length - 1; i++) {
      dist += calculateDistanceKm(stops[i].lat, stops[i].lng, stops[i + 1].lat, stops[i + 1].lng)
    }
    dist += calculateDistanceKm(stops[stops.length - 1].lat, stops[stops.length - 1].lng, destination.lat, destination.lng)
    return dist
  }

  async optimize(input: OptimizationInput): Promise<OptimizationResult> {
    const { origin, stops, destination } = input

    if (stops.length <= 2) {
      // 2 or fewer stops cannot benefit from 2-opt swap
      const nn = new NearestNeighborOptimizer()
      return nn.optimize(input)
    }

    // Step 1: Obtain initial tour using Nearest Neighbor
    const nn = new NearestNeighborOptimizer()
    const initialResult = await nn.optimize(input)
    let bestTour = [...initialResult.orderedStops]
    let bestDist = this.calculateTotalTourDistance(origin, bestTour, destination)

    // Step 2: 2-Opt Local Search
    let improved = true
    let iterations = 0
    const maxIterations = 50

    while (improved && iterations < maxIterations) {
      improved = false
      iterations++

      for (let i = 0; i < bestTour.length - 1; i++) {
        for (let k = i + 1; k < bestTour.length; k++) {
          // Perform 2-opt swap: reverse segment between i and k
          const candidateTour = [
            ...bestTour.slice(0, i),
            ...bestTour.slice(i, k + 1).reverse(),
            ...bestTour.slice(k + 1),
          ]

          const candidateDist = this.calculateTotalTourDistance(origin, candidateTour, destination)

          if (candidateDist < bestDist - 0.01) {
            bestTour = candidateTour
            bestDist = candidateDist
            improved = true
            break
          }
        }
        if (improved) break
      }
    }

    return {
      orderedStops: bestTour,
      totalDistanceKm: Math.round(bestDist * 10) / 10,
      algorithm: '2-opt',
    }
  }
}

/**
 * Phase 3: Future Google OR-Tools / External VRP Solver Provider
 */
export class ExternalVRPOptimizer implements IRouteOptimizer {
  async optimize(input: OptimizationInput): Promise<OptimizationResult> {
    // Falls back gracefully to 2-Opt if external OR-Tools solver is not connected
    const fallback = new TwoOptRouteOptimizer()
    return fallback.optimize(input)
  }
}

export function createOptimizer(strategy: 'nearest-neighbor' | '2-opt' | 'vrp' = '2-opt'): IRouteOptimizer {
  switch (strategy) {
    case 'nearest-neighbor':
      return new NearestNeighborOptimizer()
    case 'vrp':
      return new ExternalVRPOptimizer()
    case '2-opt':
    default:
      return new TwoOptRouteOptimizer()
  }
}


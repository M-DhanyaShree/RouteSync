// Haversine distance in km (kept as fallback)
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
  distanceMatrix?: number[][] // Matrix in meters from ORS
}

export interface OptimizationResult {
  orderedStops: StopPoint[]
  totalDistanceKm: number
  algorithm: 'nearest-neighbor' | '2-opt' | 'vrp-solver'
}

export interface IRouteOptimizer {
  optimize(input: OptimizationInput): Promise<OptimizationResult>
}

// Helper to get distance from matrix or fallback to Haversine
function getDistance(
  matrix: number[][] | undefined,
  fromIdx: number,
  toIdx: number,
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number
): number {
  if (matrix && matrix[fromIdx] && matrix[fromIdx][toIdx] !== undefined) {
    return matrix[fromIdx][toIdx] / 1000 // ORS returns meters, we use km
  }
  return calculateDistanceKm(fromLat, fromLng, toLat, toLng)
}

export class NearestNeighborOptimizer implements IRouteOptimizer {
  async optimize(input: OptimizationInput): Promise<OptimizationResult> {
    const { origin, stops, destination, distanceMatrix } = input

    if (stops.length === 0) {
      const directDist = getDistance(distanceMatrix, 0, 1, origin.lat, origin.lng, destination.lat, destination.lng)
      return { orderedStops: [], totalDistanceKm: Math.round(directDist * 10) / 10, algorithm: 'nearest-neighbor' }
    }

    const unvisited = stops.map((stop, i) => ({ stop, origIdx: i + 1 }))
    const ordered: StopPoint[] = []
    
    let currentLat = origin.lat
    let currentLng = origin.lng
    let currentMatrixIdx = 0 // start at origin (0)
    let totalDist = 0

    while (unvisited.length > 0) {
      let nearestIdx = 0
      let minDistance = Infinity

      for (let i = 0; i < unvisited.length; i++) {
        const u = unvisited[i]
        const d = getDistance(distanceMatrix, currentMatrixIdx, u.origIdx, currentLat, currentLng, u.stop.lat, u.stop.lng)
        if (d < minDistance) {
          minDistance = d
          nearestIdx = i
        }
      }

      const next = unvisited.splice(nearestIdx, 1)[0]
      ordered.push(next.stop)
      totalDist += minDistance
      currentLat = next.stop.lat
      currentLng = next.stop.lng
      currentMatrixIdx = next.origIdx
    }

    const destIdx = stops.length + 1
    totalDist += getDistance(distanceMatrix, currentMatrixIdx, destIdx, currentLat, currentLng, destination.lat, destination.lng)

    return {
      orderedStops: ordered,
      totalDistanceKm: Math.round(totalDist * 10) / 10,
      algorithm: 'nearest-neighbor',
    }
  }
}

export class TwoOptRouteOptimizer implements IRouteOptimizer {
  private calculateTotalTourDistance(
    origin: { lat: number; lng: number },
    tourIndices: number[], // indices mapping to original stops array (1-based, 0 is origin, N+1 is dest)
    stops: StopPoint[],
    destination: { lat: number; lng: number },
    matrix?: number[][]
  ): number {
    if (tourIndices.length === 0) {
      return getDistance(matrix, 0, 1, origin.lat, origin.lng, destination.lat, destination.lng)
    }

    const firstStopIdx = tourIndices[0]
    const firstStop = stops[firstStopIdx - 1]
    let dist = getDistance(matrix, 0, firstStopIdx, origin.lat, origin.lng, firstStop.lat, firstStop.lng)

    for (let i = 0; i < tourIndices.length - 1; i++) {
      const fromIdx = tourIndices[i]
      const toIdx = tourIndices[i + 1]
      const fromStop = stops[fromIdx - 1]
      const toStop = stops[toIdx - 1]
      dist += getDistance(matrix, fromIdx, toIdx, fromStop.lat, fromStop.lng, toStop.lat, toStop.lng)
    }

    const lastStopIdx = tourIndices[tourIndices.length - 1]
    const lastStop = stops[lastStopIdx - 1]
    const destIdx = stops.length + 1
    dist += getDistance(matrix, lastStopIdx, destIdx, lastStop.lat, lastStop.lng, destination.lat, destination.lng)
    
    return dist
  }

  async optimize(input: OptimizationInput): Promise<OptimizationResult> {
    const { origin, stops, destination, distanceMatrix } = input

    if (stops.length <= 2) {
      const nn = new NearestNeighborOptimizer()
      return nn.optimize(input)
    }

    const nn = new NearestNeighborOptimizer()
    const initialResult = await nn.optimize(input)
    
    // Map initial result back to indices 1..N
    let bestTourIndices = initialResult.orderedStops.map(s => stops.findIndex(orig => orig.studentId === s.studentId) + 1)
    let bestDist = this.calculateTotalTourDistance(origin, bestTourIndices, stops, destination, distanceMatrix)

    let improved = true
    let iterations = 0
    const maxIterations = 50

    while (improved && iterations < maxIterations) {
      improved = false
      iterations++

      for (let i = 0; i < bestTourIndices.length - 1; i++) {
        for (let k = i + 1; k < bestTourIndices.length; k++) {
          const candidateTour = [
            ...bestTourIndices.slice(0, i),
            ...bestTourIndices.slice(i, k + 1).reverse(),
            ...bestTourIndices.slice(k + 1),
          ]

          const candidateDist = this.calculateTotalTourDistance(origin, candidateTour, stops, destination, distanceMatrix)

          if (candidateDist < bestDist - 0.01) {
            bestTourIndices = candidateTour
            bestDist = candidateDist
            improved = true
            break
          }
        }
        if (improved) break
      }
    }

    const orderedStops = bestTourIndices.map(idx => stops[idx - 1])

    return {
      orderedStops,
      totalDistanceKm: Math.round(bestDist * 10) / 10,
      algorithm: '2-opt',
    }
  }
}

export class ExternalVRPOptimizer implements IRouteOptimizer {
  async optimize(input: OptimizationInput): Promise<OptimizationResult> {
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

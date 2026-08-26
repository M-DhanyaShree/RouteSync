import axios from 'axios'
import { env } from '../../config/env'
import { logger } from '../../config/logger'
import { AppError } from '../../middleware/error.middleware'

const ORS_BASE_URL = 'https://api.openrouteservice.org/v2'

export interface MatrixResult {
  distances: number[][]
  durations: number[][]
}

export interface DirectionsResult {
  distance: number
  duration: number
  coordinates: [number, number][] // [lat, lng] format
}

class ORSService {
  private getHeaders() {
    if (!env.ORS_API_KEY) {
      throw new AppError('OpenRouteService API key is missing. Please configure ORS_API_KEY.', 500)
    }
    return {
      Authorization: env.ORS_API_KEY,
      'Content-Type': 'application/json',
    }
  }

  /**
   * Get travel distance and duration matrices
   * @param locations Array of [lat, lng]
   */
  async getMatrix(locations: [number, number][]): Promise<MatrixResult> {
    if (locations.length < 2) {
      return { distances: [[0]], durations: [[0]] }
    }

    // ORS expects [lng, lat]
    const coords = locations.map(loc => [loc[1], loc[0]])

    try {
      const response = await axios.post(
        `${ORS_BASE_URL}/matrix/driving-car`,
        {
          locations: coords,
          metrics: ['distance', 'duration']
        },
        { headers: this.getHeaders() }
      )

      return {
        distances: response.data.distances,
        durations: response.data.durations,
      }
    } catch (error: any) {
      logger.error('ORS Matrix API Error:', error?.response?.data || error.message)
      throw new AppError('Failed to calculate travel matrix using OpenRouteService', 502)
    }
  }

  /**
   * Get actual route geometry and total travel stats
   * @param locations Array of [lat, lng] in the order they should be visited
   */
  async getDirections(locations: [number, number][]): Promise<DirectionsResult> {
    if (locations.length < 2) {
      return { distance: 0, duration: 0, coordinates: [] }
    }

    const coords = locations.map(loc => [loc[1], loc[0]])

    try {
      const response = await axios.post(
        `${ORS_BASE_URL}/directions/driving-car/geojson`,
        { coordinates: coords },
        { headers: this.getHeaders() }
      )

      const feature = response.data.features?.[0]
      if (!feature) throw new Error('No route found')

      const properties = feature.properties
      // GeoJSON returns [lng, lat], map it back to [lat, lng] for Leaflet
      const geometry = feature.geometry.coordinates.map((c: [number, number]) => [c[1], c[0]])

      return {
        distance: properties.summary.distance, // in meters
        duration: properties.summary.duration, // in seconds
        coordinates: geometry
      }
    } catch (error: any) {
      logger.error('ORS Directions API Error:', error?.response?.data || error.message)
      throw new AppError('Failed to generate route geometry using OpenRouteService', 502)
    }
  }
}

export const orsService = new ORSService()

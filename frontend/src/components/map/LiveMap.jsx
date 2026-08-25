import React, { useEffect, useMemo } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import PropTypes from 'prop-types'

// Fix default leaflet marker icon resolution
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

// Custom Markers
const createVanIcon = () => new L.DivIcon({
  html: `
    <div style="position: relative; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center;">
      <div style="position: absolute; width: 36px; height: 36px; border-radius: 50%; background: rgba(249, 115, 22, 0.3); animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
      <div style="position: relative; background: #f97316; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(249, 115, 22, 0.6); border: 2.5px solid white;">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect width="16" height="16" x="4" y="4" rx="2"/><path d="M4 8h16"/><path d="M4 16h16"/></svg>
      </div>
    </div>
  `,
  className: 'custom-van-marker',
  iconSize: [36, 36],
  iconAnchor: [18, 18],
})

const createStopIcon = (sequence, status) => {
  let bgColor = '#3b82f6' // Blue default (Pending)
  let borderColor = '#ffffff'
  let label = sequence !== undefined ? String(sequence + 1) : '•'

  if (status === 'PICKED_UP') {
    bgColor = '#10b981' // Green
    label = '✓'
  } else if (status === 'ARRIVED') {
    bgColor = '#f59e0b' // Amber
  } else if (status === 'SKIPPED') {
    bgColor = '#64748b' // Slate / Skipped
    label = '✕'
  }

  return new L.DivIcon({
    html: `
      <div style="background: ${bgColor}; color: white; width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 11px; box-shadow: 0 2px 8px rgba(0,0,0,0.3); border: 2px solid ${borderColor};">
        ${label}
      </div>
    `,
    className: 'custom-stop-marker',
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  })
}

const createDestinationIcon = () => new L.DivIcon({
  html: `
    <div style="background: #8b5cf6; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(139, 92, 246, 0.5); border: 2.5px solid white;">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" x2="4" y1="22" y2="15"/></svg>
    </div>
  `,
  className: 'custom-dest-marker',
  iconSize: [32, 32],
  iconAnchor: [16, 16],
})

// Auto-Fit map to show all stops, driver, and destination
const MapBoundsFitter = ({ coordinates }) => {
  const map = useMap()
  useEffect(() => {
    if (coordinates && coordinates.length > 0) {
      try {
        const bounds = L.latLngBounds(coordinates)
        if (bounds.isValid()) {
          map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 })
        }
      } catch (err) {
        // Safe fallback
      }
    }
  }, [coordinates, map])
  return null
}

const LiveMap = ({ driverLocation, stops = [], destination = null, route = null }) => {
  // Default coordinates: Coimbatore, Tamil Nadu (Gandhipuram / RS Puram center)
  const defaultCenter = [11.0168, 76.9558]
  const center = driverLocation ? [driverLocation.lat, driverLocation.lng] : defaultCenter

  // Build the complete path from source / driver through sequenced active stops to destination
  const pathPositions = useMemo(() => {
    if (route && route.length > 0) {
      return route
    }
    const points = []
    if (driverLocation?.lat && driverLocation?.lng) {
      points.push([driverLocation.lat, driverLocation.lng])
    }

    // Filter out skipped stops for active path visualization
    const sortedStops = [...stops]
      .filter((s) => s.status !== 'SKIPPED')
      .sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0))

    sortedStops.forEach((s) => {
      if (s.lat && s.lng) {
        points.push([s.lat, s.lng])
      }
    })

    if (destination?.lat && destination?.lng) {
      points.push([destination.lat, destination.lng])
    }

    return points
  }, [driverLocation, stops, destination, route])

  // Collect all coordinate points for auto bounding
  const allCoordinates = useMemo(() => {
    const coords = []
    if (driverLocation?.lat) coords.push([driverLocation.lat, driverLocation.lng])
    stops.forEach((s) => {
      if (s.lat && s.lng) coords.push([s.lat, s.lng])
    })
    if (destination?.lat && destination?.lng) coords.push([destination.lat, destination.lng])
    return coords
  }, [driverLocation, stops, destination])

  return (
    <div className="w-full h-full rounded-2xl overflow-hidden shadow-sm border border-slate-800 bg-slate-950 relative z-0">
      <MapContainer
        center={center}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />

        {/* Auto fit map bounds */}
        {allCoordinates.length > 0 && <MapBoundsFitter coordinates={allCoordinates} />}

        {/* Path from Source to Destination in BLUE COLOR */}
        {pathPositions.length > 1 && (
          <>
            {/* Blue outer glow / casing */}
            <Polyline
              positions={pathPositions}
              color="#1d4ed8"
              weight={7}
              opacity={0.5}
            />
            {/* Primary vibrant blue route line */}
            <Polyline
              positions={pathPositions}
              color="#2563eb"
              weight={4.5}
              opacity={0.95}
            />
          </>
        )}

        {/* Driver Van Marker */}
        {driverLocation && driverLocation.lat && driverLocation.lng && (
          <Marker position={[driverLocation.lat, driverLocation.lng]} icon={createVanIcon()}>
            <Popup>
              <div className="text-xs p-1">
                <p className="font-bold text-orange-600 text-sm">🚐 Active Van</p>
                <p className="text-slate-600">Coimbatore Metro Fleet</p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Pickup Stops Markers */}
        {stops.map((stop, idx) => {
          if (!stop.lat || !stop.lng) return null
          return (
            <Marker
              key={stop.id || idx}
              position={[stop.lat, stop.lng]}
              icon={createStopIcon(stop.sequence ?? idx, stop.status)}
            >
              <Popup>
                <div className="text-xs p-1 space-y-0.5">
                  <p className="font-bold text-slate-800">{stop.name || `Pickup #${(stop.sequence ?? idx) + 1}`}</p>
                  <p className="text-slate-500">{stop.address || 'Coimbatore Pickup Spot'}</p>
                  {stop.status && (
                    <span className="inline-block mt-1 px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded font-semibold text-[10px]">
                      Status: {stop.status}
                    </span>
                  )}
                  {stop.plannedEta && (
                    <p className="text-slate-600 font-medium text-[11px] mt-1">
                      ETA: {new Date(stop.plannedEta).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  )}
                </div>
              </Popup>
            </Marker>
          )
        })}

        {/* Destination Campus Marker */}
        {destination && destination.lat && destination.lng && (
          <Marker position={[destination.lat, destination.lng]} icon={createDestinationIcon()}>
            <Popup>
              <div className="text-xs p-1">
                <p className="font-bold text-purple-700 text-sm">🎓 {destination.name || 'Campus / Destination'}</p>
                <p className="text-slate-600">{destination.address || 'Coimbatore Campus'}</p>
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  )
}

LiveMap.propTypes = {
  driverLocation: PropTypes.shape({
    lat: PropTypes.number,
    lng: PropTypes.number,
  }),
  stops: PropTypes.array,
  destination: PropTypes.shape({
    lat: PropTypes.number,
    lng: PropTypes.number,
    name: PropTypes.string,
    address: PropTypes.string,
  }),
  route: PropTypes.array,
}

export default LiveMap

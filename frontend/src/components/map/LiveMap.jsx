import React from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import PropTypes from 'prop-types'

// Fix for default marker icon missing in React Leaflet
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

// Custom Van Icon
const vanIcon = new L.DivIcon({
  html: `<div style="background-color: #FC8019; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 10px rgba(252,128,25,0.5); border: 3px solid white;"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="16" height="16" x="4" y="4" rx="2"/><path d="M4 8h16"/><path d="M4 16h16"/></svg></div>`,
  className: 'van-icon',
  iconSize: [30, 30],
  iconAnchor: [15, 15],
})

// Component to recenter map when driver moves
const RecenterMap = ({ lat, lng }) => {
  const map = useMap()
  React.useEffect(() => {
    if (lat && lng) {
      map.setView([lat, lng])
    }
  }, [lat, lng, map])
  return null
}

const LiveMap = ({ driverLocation, stops = [], route = null }) => {
  const center = driverLocation ? [driverLocation.lat, driverLocation.lng] : [12.9716, 77.5946] // Default Bangalore

  return (
    <div className="w-full h-full rounded-2xl overflow-hidden shadow-sm border border-slate-200 dark:border-slate-800 z-0">
      <MapContainer 
        center={center} 
        zoom={14} 
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />
        
        {driverLocation && (
          <>
            <Marker position={[driverLocation.lat, driverLocation.lng]} icon={vanIcon}>
              <Popup>Van is here</Popup>
            </Marker>
            <RecenterMap lat={driverLocation.lat} lng={driverLocation.lng} />
          </>
        )}

        {stops.map((stop, idx) => (
          <Marker key={stop.id || idx} position={[stop.lat, stop.lng]}>
            <Popup>
              <b>{stop.name || `Stop ${idx + 1}`}</b><br/>
              {stop.address}
            </Popup>
          </Marker>
        ))}

        {route && (
          <Polyline 
            positions={route} 
            color="#FC8019" 
            weight={4} 
            opacity={0.8} 
            dashArray="10, 10" 
          />
        )}
      </MapContainer>
    </div>
  )
}

LiveMap.propTypes = {
  driverLocation: PropTypes.shape({
    lat: PropTypes.number.isRequired,
    lng: PropTypes.number.isRequired
  }),
  stops: PropTypes.array,
  route: PropTypes.array
}

export default LiveMap

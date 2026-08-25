import React, { useState, useEffect, useRef } from 'react'
import PropTypes from 'prop-types'
import { MapPin, Search, X, Loader2, Navigation } from 'lucide-react'

// Curated top Coimbatore locations & landmarks with precise coordinates
export const COIMBATORE_LANDMARKS = [
  {
    name: 'RS Puram',
    address: 'D.B. Road, RS Puram, Coimbatore, Tamil Nadu 641002',
    lat: 11.0090,
    lng: 76.9500,
    category: 'Neighborhood',
  },
  {
    name: 'Gandhipuram Central Hub',
    address: 'Cross Cut Road, Gandhipuram, Coimbatore, Tamil Nadu 641012',
    lat: 11.0183,
    lng: 76.9644,
    category: 'Transit & Commercial',
  },
  {
    name: 'PSG Tech & Sarvajana Campus',
    address: 'Avinashi Road, Peelamedu, Coimbatore, Tamil Nadu 641004',
    lat: 11.0240,
    lng: 77.0028,
    category: 'Educational Campus',
  },
  {
    name: 'Saibaba Colony',
    address: 'NSR Road, Saibaba Colony, Coimbatore, Tamil Nadu 641011',
    lat: 11.0280,
    lng: 76.9420,
    category: 'Residential',
  },
  {
    name: 'Ramanathapuram',
    address: 'Trichy Road, Ramanathapuram, Coimbatore, Tamil Nadu 641045',
    lat: 10.9980,
    lng: 76.9850,
    category: 'Commercial & Residential',
  },
  {
    name: 'Singanallur',
    address: 'Kamarajar Road, Singanallur, Coimbatore, Tamil Nadu 641005',
    lat: 10.9995,
    lng: 77.0260,
    category: 'Transit & Hub',
  },
  {
    name: 'Saravanampatti (IT Corridor)',
    address: 'Sathy Road, Saravanampatti, Coimbatore, Tamil Nadu 641035',
    lat: 11.0805,
    lng: 76.9940,
    category: 'Tech Zone',
  },
  {
    name: 'Hopes College / Peelamedu Junction',
    address: 'Avinashi Road, Hopes College, Coimbatore, Tamil Nadu 641004',
    lat: 11.0267,
    lng: 77.0125,
    category: 'Peelamedu Area',
  },
  {
    name: 'Town Hall & Ukkadam',
    address: 'Oppanakara Street, Town Hall, Coimbatore, Tamil Nadu 641001',
    lat: 10.9930,
    lng: 76.9620,
    category: 'City Center',
  },
  {
    name: 'Coimbatore Junction Railway Station',
    address: 'State Bank Road, Gopalapuram, Coimbatore, Tamil Nadu 641018',
    lat: 10.9979,
    lng: 76.9674,
    category: 'Railway Hub',
  },
  {
    name: 'Coimbatore International Airport (CJB)',
    address: 'Civil Aerodrome Post, Peelamedu, Coimbatore, Tamil Nadu 641014',
    lat: 11.0283,
    lng: 77.0434,
    category: 'Airport',
  },
  {
    name: 'Ganapathy',
    address: 'Sathy Road, Ganapathy, Coimbatore, Tamil Nadu 641006',
    lat: 11.0375,
    lng: 76.9740,
    category: 'Residential & Commercial',
  },
  {
    name: 'Vadavalli',
    address: 'Maruthamalai Main Road, Vadavalli, Coimbatore, Tamil Nadu 641041',
    lat: 11.0225,
    lng: 76.9020,
    category: 'West Coimbatore',
  },
  {
    name: 'Thudiyalur',
    address: 'Mettupalayam Road, Thudiyalur, Coimbatore, Tamil Nadu 641034',
    lat: 11.0770,
    lng: 76.9380,
    category: 'North Coimbatore',
  },
  {
    name: 'CIT Coimbatore (Coimbatore Institute of Technology)',
    address: 'Civil Aerodrome Post, Avinashi Rd, Peelamedu, Coimbatore 641014',
    lat: 11.0287,
    lng: 77.0270,
    category: 'Educational Institute',
  },
]

export const LocationAutocomplete = ({
  value = '',
  onChange,
  onSelect,
  placeholder = 'Search location in Coimbatore...',
  id = 'location-search-input',
  disabled = false,
  className = '',
}) => {
  const [query, setQuery] = useState(value)
  const [isOpen, setIsOpen] = useState(false)
  const [suggestions, setSuggestions] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const wrapperRef = useRef(null)
  const debounceTimer = useRef(null)

  useEffect(() => {
    setQuery(value)
  }, [value])

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const filterLocations = (searchTerm) => {
    if (!searchTerm.trim()) {
      return COIMBATORE_LANDMARKS.slice(0, 6)
    }
    const clean = searchTerm.toLowerCase().trim()
    return COIMBATORE_LANDMARKS.filter(
      (loc) =>
        loc.name.toLowerCase().includes(clean) ||
        loc.address.toLowerCase().includes(clean) ||
        loc.category.toLowerCase().includes(clean)
    )
  }

  const handleInputChange = (e) => {
    const text = e.target.value
    setQuery(text)
    if (onChange) onChange(text)
    setIsOpen(true)

    // Local instant filtering
    const localMatches = filterLocations(text)
    setSuggestions(localMatches)

    // Remote Nominatim geocoder query for custom Coimbatore addresses
    if (text.trim().length >= 3) {
      if (debounceTimer.current) clearTimeout(debounceTimer.current)
      setIsLoading(true)

      debounceTimer.current = setTimeout(async () => {
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
              text + ', Coimbatore, Tamil Nadu'
            )}&countrycodes=in&limit=4&viewbox=76.80,11.20,77.15,10.85`
          )
          if (res.ok) {
            const data = await res.json()
            const remoteItems = data.map((item) => ({
              name: item.name || item.display_name.split(',')[0],
              address: item.display_name,
              lat: parseFloat(item.lat),
              lng: parseFloat(item.lon),
              category: 'Live Search Match',
            }))

            // Merge local and remote without duplicates
            const combined = [...localMatches]
            remoteItems.forEach((r) => {
              if (!combined.some((c) => Math.abs(c.lat - r.lat) < 0.001 && Math.abs(c.lng - r.lng) < 0.001)) {
                combined.push(r)
              }
            })
            setSuggestions(combined)
          }
        } catch (err) {
          // Graceful fallback to local matches
        } finally {
          setIsLoading(false)
        }
      }, 350)
    }
  }

  const handleSelectLocation = (loc) => {
    setQuery(loc.address || loc.name)
    setIsOpen(false)
    if (onSelect) {
      onSelect({
        name: loc.name,
        address: loc.address || loc.name,
        lat: loc.lat,
        lng: loc.lng,
      })
    }
  }

  const handleClear = () => {
    setQuery('')
    if (onChange) onChange('')
    setSuggestions(COIMBATORE_LANDMARKS.slice(0, 6))
  }

  const handleUseCurrentGPS = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser')
      return
    }
    setIsLoading(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLoading(false)
        const lat = pos.coords.latitude
        const lng = pos.coords.longitude
        const gpsLoc = {
          name: 'Current Device Location',
          address: `GPS Location (${lat.toFixed(4)}, ${lng.toFixed(4)}) - Coimbatore Area`,
          lat,
          lng,
        }
        handleSelectLocation(gpsLoc)
      },
      () => {
        setIsLoading(false)
        // Fallback default Coimbatore center if browser blocks GPS
        const fallback = COIMBATORE_LANDMARKS[0]
        handleSelectLocation(fallback)
      },
      { timeout: 8000 }
    )
  }

  return (
    <div ref={wrapperRef} className={`relative w-full ${className}`}>
      <div className="relative flex items-center">
        <div className="absolute left-3.5 text-slate-400 pointer-events-none flex items-center">
          {isLoading ? <Loader2 size={18} className="animate-spin text-brand-500" /> : <Search size={18} />}
        </div>
        <input
          id={id}
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => {
            setIsOpen(true)
            if (suggestions.length === 0) {
              setSuggestions(filterLocations(query))
            }
          }}
          disabled={disabled}
          placeholder={placeholder}
          className="w-full pl-10 pr-20 py-2.5 bg-slate-900/90 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all shadow-inner"
        />
        <div className="absolute right-2 flex items-center gap-1">
          {query && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 text-slate-400 hover:text-slate-200 rounded-md transition-colors"
              title="Clear input"
            >
              <X size={15} />
            </button>
          )}
          <button
            type="button"
            onClick={handleUseCurrentGPS}
            className="p-1.5 text-slate-400 hover:text-brand-400 rounded-md transition-colors hover:bg-slate-800"
            title="Use current GPS coordinate"
          >
            <Navigation size={15} />
          </button>
        </div>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 max-h-72 overflow-y-auto divide-y divide-slate-800/60 backdrop-blur-md">
          <div className="px-3 py-1.5 bg-slate-950/60 flex items-center justify-between text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
            <span>Coimbatore Locations</span>
            <span>{suggestions.length} places</span>
          </div>

          {suggestions.length === 0 ? (
            <div className="p-4 text-center text-sm text-slate-400">
              No matching locations found in Coimbatore.
            </div>
          ) : (
            suggestions.map((item, idx) => (
              <button
                key={`${item.name}-${idx}`}
                type="button"
                onClick={() => handleSelectLocation(item)}
                className="w-full text-left px-3.5 py-2.5 hover:bg-brand-500/10 focus:bg-brand-500/10 focus:outline-none transition-colors flex items-start gap-3 group"
              >
                <div className="mt-0.5 w-7 h-7 rounded-lg bg-slate-800 text-brand-400 flex items-center justify-center flex-shrink-0 group-hover:bg-brand-500 group-hover:text-white transition-colors">
                  <MapPin size={15} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-200 group-hover:text-brand-300 truncate">
                      {item.name}
                    </p>
                    {item.category && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-slate-800 text-slate-400 rounded font-medium whitespace-nowrap">
                        {item.category}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 truncate mt-0.5">{item.address}</p>
                  <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                    {item.lat.toFixed(4)}° N, {item.lng.toFixed(4)}° E
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}

LocationAutocomplete.propTypes = {
  value: PropTypes.string,
  onChange: PropTypes.func,
  onSelect: PropTypes.func,
  placeholder: PropTypes.string,
  id: PropTypes.string,
  disabled: PropTypes.bool,
  className: PropTypes.string,
}

export default LocationAutocomplete

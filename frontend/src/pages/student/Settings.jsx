import React, { useState, useEffect } from 'react'
import { useAuthStore } from '../../store/authStore'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { MapPin, Bell, User, Phone, Check, Navigation, Search, Shield } from 'lucide-react'
import api from '../../api/axios'
import { requestNotificationPermission, showNotification } from '../../lib/notifications'
import LiveMap from '../../components/map/LiveMap'

const POPULAR_PICKUP_SPOTS = [
  { address: 'Indiranagar 100ft Road, Bengaluru', lat: 12.9784, lng: 77.6408 },
  { address: 'Koramangala 4th Block, Bengaluru', lat: 12.9352, lng: 77.6245 },
  { address: 'HSR Layout Sector 2, Bengaluru', lat: 12.9116, lng: 77.6389 },
  { address: 'MG Road Metro Station, Bengaluru', lat: 12.9756, lng: 77.6066 },
  { address: 'Whitefield ITPL Main Road, Bengaluru', lat: 12.9863, lng: 77.7342 },
]

const StudentSettings = () => {
  const { user } = useAuthStore()
  const [address, setAddress] = useState('')
  const [coords, setCoords] = useState({ lat: 12.9716, lng: 77.5946 })
  const [label, setLabel] = useState('Home Pickup Point')
  const [loading, setLoading] = useState(false)
  const [savedSuccess, setSavedSuccess] = useState(false)
  const [notificationsEnabled, setNotificationsEnabled] = useState(
    'Notification' in window && Notification.permission === 'granted'
  )

  useEffect(() => {
    // Fetch current saved location
    api.get('/auth/location')
      .then((res) => {
        if (res.data.data) {
          const loc = res.data.data
          setAddress(loc.address || '')
          setCoords({ lat: loc.lat || 12.9716, lng: loc.lng || 77.5946 })
          setLabel(loc.label || 'Home Pickup Point')
        }
      })
      .catch((err) => console.error('Error fetching location:', err))
  }, [])

  const handleSelectPreset = (spot) => {
    setAddress(spot.address)
    setCoords({ lat: spot.lat, lng: spot.lng })
  }

  const handleSaveLocation = async (e) => {
    e.preventDefault()
    try {
      setLoading(true)
      await api.post('/auth/location', {
        lat: coords.lat,
        lng: coords.lng,
        address: address || 'Custom Pickup Location',
        label,
      })
      setSavedSuccess(true)
      setTimeout(() => setSavedSuccess(false), 3000)
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save location')
    } finally {
      setLoading(false)
    }
  }

  const handleEnableNotifications = async () => {
    const granted = await requestNotificationPermission()
    setNotificationsEnabled(granted)
    if (granted) {
      showNotification('RouteSync Notifications Active', {
        body: "You'll receive live alerts when your driver departs and approaches your stop.",
      })
    }
  }

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 font-display">Student Settings & Preferences</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Configure your morning pickup coordinates, contact details, and route alert notifications.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Profile Card */}
        <Card className="border-slate-800 bg-slate-900/50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-slate-100">
              <User size={18} className="text-brand-500" /> Account Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-brand-500/20 text-brand-400 flex items-center justify-center font-bold text-lg">
                {user?.name?.[0] || 'S'}
              </div>
              <div>
                <p className="font-semibold text-slate-100">{user?.name}</p>
                <p className="text-xs text-slate-400">{user?.email}</p>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800 space-y-2 text-xs text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-400">Role:</span>
                <span className="font-semibold text-brand-400 uppercase">{user?.role}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Phone:</span>
                <span className="font-semibold">{user?.phone || '+91 98765 43210'}</span>
              </div>
            </div>

            {/* Notification Toggle */}
            <div className="pt-4 border-t border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
                  <Bell size={14} className="text-brand-400" /> Live Web Alerts
                </div>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    notificationsEnabled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-400'
                  }`}
                >
                  {notificationsEnabled ? 'Active' : 'Disabled'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mb-3">
                Receive browser popups when the van departs and arrives within 500m of your stop.
              </p>
              {!notificationsEnabled && (
                <Button size="sm" variant="outline" className="w-full text-xs" onClick={handleEnableNotifications}>
                  Enable Alerts
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Pickup Location Editor (2 cols) */}
        <Card className="md:col-span-2 border-slate-800 bg-slate-900/50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-slate-100">
              <MapPin size={18} className="text-brand-500" /> Morning Pickup Point & Coordinates
            </CardTitle>
            <p className="text-xs text-slate-400">
              The 2-Opt route optimizer utilizes your exact pickup coordinates to construct the optimal morning sequence.
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveLocation} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Pickup Spot Label</label>
                <input
                  type="text"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="e.g. Home Gate, Society Clubhouse"
                  className="w-full px-3 py-2 text-sm rounded-xl bg-slate-800 border border-slate-700 text-slate-100 focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Pickup Address / Landmark</label>
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Enter landmark or street address..."
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-xl bg-slate-800 border border-slate-700 text-slate-100 focus:outline-none focus:border-brand-500"
                    required
                  />
                </div>
              </div>

              {/* Preset Quick Select */}
              <div>
                <span className="text-[11px] font-semibold text-slate-400 block mb-1.5">Quick Select Bengaluru Hubs:</span>
                <div className="flex flex-wrap gap-1.5">
                  {POPULAR_PICKUP_SPOTS.map((spot, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleSelectPreset(spot)}
                      className="px-2.5 py-1 text-[11px] rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 transition-colors"
                    >
                      {spot.address.split(',')[0]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Latitude and Longitude Coordinates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Latitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={coords.lat}
                    onChange={(e) => setCoords({ ...coords, lat: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-xs font-mono rounded-xl bg-slate-800 border border-slate-700 text-slate-100 focus:outline-none focus:border-brand-500"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Longitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={coords.lng}
                    onChange={(e) => setCoords({ ...coords, lng: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-xs font-mono rounded-xl bg-slate-800 border border-slate-700 text-slate-100 focus:outline-none focus:border-brand-500"
                    required
                  />
                </div>
              </div>

              {/* Map Preview */}
              <div className="h-44 rounded-xl overflow-hidden border border-slate-800">
                <LiveMap
                  driverLocation={null}
                  stops={[{ id: 'my-pickup', name: label, address, lat: coords.lat, lng: coords.lng }]}
                />
              </div>

              <div className="pt-2 flex items-center justify-between">
                {savedSuccess ? (
                  <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                    <Check size={14} /> Pickup location saved successfully!
                  </span>
                ) : (
                  <span className="text-xs text-slate-400">Updates take effect immediately on next route start</span>
                )}
                <Button type="submit" disabled={loading} className="gap-2 bg-gradient-brand text-white shadow-glow">
                  {loading ? 'Saving...' : 'Save Pickup Location'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default StudentSettings

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { useAuthStore } from '../../store/authStore'
import { Users, Play, Clock, CheckCircle, Navigation, MapPin, Check, SkipForward, Flag, AlertCircle, RefreshCw } from 'lucide-react'
import api from '../../api/axios'
import { getSocket } from '../../lib/socket'
import LiveMap from '../../components/map/LiveMap'
import LocationAutocomplete, { COIMBATORE_LANDMARKS } from '../../components/ui/LocationAutocomplete'

const DriverDashboard = () => {
  const { user } = useAuthStore()
  const [groups, setGroups] = useState([])
  const [selectedGroup, setSelectedGroup] = useState(null)
  const [todayAttendance, setTodayAttendance] = useState([])
  const [activeTrip, setActiveTrip] = useState(null)
  const [loading, setLoading] = useState(true)
  const [startingTrip, setStartingTrip] = useState(false)
  // Default coordinates: Gandhipuram, Coimbatore, Tamil Nadu
  const [vanLocation, setVanLocation] = useState({ lat: 11.0183, lng: 76.9644 })
  const [lateAbsenceAlert, setLateAbsenceAlert] = useState(null)

  // Fetch driver groups
  const loadData = async () => {
    try {
      setLoading(true)
      const res = await api.get('/groups/my')
      const driverGroups = res.data.data || []
      setGroups(driverGroups)

      if (driverGroups.length > 0) {
        const group = driverGroups[0]
        setSelectedGroup(group)

        // Load attendance for group
        const attRes = await api.get(`/attendance/group/${group.id}/today`)
        setTodayAttendance(attRes.data.data || [])

        // Check for active trip
        const tripRes = await api.get(`/trips/active/${group.id}`)
        if (tripRes.data.data) {
          setActiveTrip(tripRes.data.data)
        } else {
          setActiveTrip(null)
        }
      }
    } catch (err) {
      console.error('Error loading driver data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Socket listener for real-time events (attendance changes, late absence re-optimization, etc.)
  useEffect(() => {
    const socket = getSocket()
    if (!socket || !selectedGroup) return

    socket.emit('join:group', selectedGroup.id)
    if (activeTrip?.id) {
      socket.emit('join:trip', activeTrip.id)
    }

    const handleAttendanceChange = () => {
      api.get(`/attendance/group/${selectedGroup.id}/today`).then((res) => {
        setTodayAttendance(res.data.data || [])
      })
    }

    const handleTripRecalculated = (data) => {
      if (data.updatedTrip) {
        setActiveTrip(data.updatedTrip)
      } else if (data.tripId) {
        api.get(`/trips/${data.tripId}`).then((res) => setActiveTrip(res.data.data))
      }
      setLateAbsenceAlert('Student informed late absence. Route automatically re-optimized and stop skipped.')
      setTimeout(() => setLateAbsenceAlert(null), 6000)
    }

    const handleStopUpdate = (data) => {
      if (data.recalculated && data.updatedTrip) {
        setActiveTrip(data.updatedTrip)
      }
    }

    socket.on('attendance:changed', handleAttendanceChange)
    socket.on('trip:recalculated', handleTripRecalculated)
    socket.on('trip:stop_update', handleStopUpdate)

    return () => {
      socket.off('attendance:changed', handleAttendanceChange)
      socket.off('trip:recalculated', handleTripRecalculated)
      socket.off('trip:stop_update', handleStopUpdate)
    }
  }, [selectedGroup, activeTrip?.id])

  const handleStartTrip = async (group) => {
    try {
      setStartingTrip(true)
      const destinationId = group.destinations?.[0]?.id
      const res = await api.post('/trips', {
        groupId: group.id,
        destinationId,
        startLat: vanLocation.lat,
        startLng: vanLocation.lng,
      })

      const newTrip = res.data.data
      setActiveTrip(newTrip)

      // Join trip room in socket
      const socket = getSocket()
      if (socket) {
        socket.emit('join:trip', newTrip.id)
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to start trip')
    } finally {
      setStartingTrip(false)
    }
  }

  const handleMarkStop = async (stopId, status) => {
    if (!activeTrip) return
    try {
      await api.put(`/trips/${activeTrip.id}/stops/${stopId}/status`, {
        status,
        actualLat: vanLocation.lat,
        actualLng: vanLocation.lng,
      })

      // Optimistic update
      setActiveTrip((prev) => {
        if (!prev) return prev
        const updatedStops = (prev.stops || []).map((s) => (s.id === stopId ? { ...s, status } : s))
        return { ...prev, stops: updatedStops }
      })
    } catch (err) {
      console.error('Failed to update stop status:', err)
      alert(err.response?.data?.message || 'Failed to update stop')
    }
  }

  const handleSimulateMovement = () => {
    if (!activeTrip || !activeTrip.stops) return
    const pendingStop = activeTrip.stops.find((s) => s.status === 'PENDING')
    let targetLat = vanLocation.lat + (Math.random() - 0.5) * 0.005
    let targetLng = vanLocation.lng + (Math.random() - 0.5) * 0.005

    if (pendingStop) {
      targetLat = pendingStop.lat
      targetLng = pendingStop.lng
    }

    const newLoc = { lat: targetLat, lng: targetLng }
    setVanLocation(newLoc)

    const socket = getSocket()
    if (socket) {
      socket.emit('location:send', {
        tripId: activeTrip.id,
        lat: targetLat,
        lng: targetLng,
        speed: 35,
        heading: 90,
      })
    }
  }

  const handleCompleteTrip = async () => {
    if (!activeTrip) return
    if (!window.confirm('Are you sure you want to complete this route?')) return
    try {
      await api.post(`/trips/${activeTrip.id}/end`)
      setActiveTrip(null)
      loadData()
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to complete trip')
    }
  }

  const handleTriggerEmergency = async () => {
    if (!activeTrip) return
    const reason = prompt('Please enter emergency reason (e.g., breakdown, accident, medical):', 'Vehicle mechanical breakdown')
    if (!reason) return

    try {
      await api.post(`/trips/${activeTrip.id}/emergency`, {
        lat: vanLocation.lat,
        lng: vanLocation.lng,
        reason,
      })
      alert('🚨 EMERGENCY SOS BROADCASTED TO FLEET & PARENTS!')
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to dispatch SOS')
    }
  }

  const presentCount = todayAttendance.filter((a) => a.status === 'PRESENT').length

  const stops =
    activeTrip?.stops?.map((s) => ({
      id: s.id,
      name: s.student?.name || `Stop #${(s.sequence ?? 0) + 1}`,
      address: s.address || `Lat: ${s.lat}, Lng: ${s.lng}`,
      lat: s.lat,
      lng: s.lng,
      status: s.status,
      sequence: s.sequence,
      plannedEta: s.plannedEta,
    })) || []

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Good morning, {user?.name}</h1>
          <p className="text-slate-500 dark:text-slate-400">
            Driver Console • {selectedGroup?.name || 'Coimbatore Metro Route'} • Coimbatore, Tamil Nadu
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={loadData} className="gap-2 self-start sm:self-auto">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
        </Button>
      </div>

      {/* Late Absence Live Notice */}
      {lateAbsenceAlert && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-sm flex items-center justify-between animate-fade-in shadow-lg">
          <div className="flex items-center gap-2">
            <AlertCircle size={18} className="text-amber-400 flex-shrink-0" />
            <span>{lateAbsenceAlert}</span>
          </div>
          <button onClick={() => setLateAbsenceAlert(null)} className="text-xs text-amber-400 underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Metrics Header */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-brand-50 dark:bg-brand-500/10 text-brand-500">
              <Users size={24} />
            </div>
            <div>
              <p className="text-sm text-slate-500 font-medium">Assigned Groups</p>
              <p className="text-2xl font-bold">{groups.length}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500">
              <CheckCircle size={24} />
            </div>
            <div>
              <p className="text-sm text-slate-500 font-medium">Students Present Today</p>
              <p className="text-2xl font-bold">
                {presentCount} <span className="text-xs text-slate-400 font-normal">/ {todayAttendance.length}</span>
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-500">
              <Navigation size={24} />
            </div>
            <div>
              <p className="text-sm text-slate-500 font-medium">Trip Status</p>
              <p className="text-2xl font-bold capitalize text-brand-500">
                {activeTrip ? 'In Progress (Live GPS)' : 'Ready in Coimbatore'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Trip Live Console */}
      {activeTrip ? (
        <div className="space-y-6">
          <Card className="border-brand-500/40 shadow-glow overflow-hidden">
            <div className="bg-brand-500 text-white p-4 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-white rounded-full animate-ping" />
                <span className="font-bold text-lg">Active Coimbatore Route In Progress</span>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="secondary" onClick={handleSimulateMovement} className="text-xs gap-1.5">
                  <Navigation size={14} /> Send GPS Ping
                </Button>
                <Button
                  size="sm"
                  onClick={handleTriggerEmergency}
                  className="text-xs gap-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold border-0"
                >
                  <AlertCircle size={14} /> SOS Alert
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={handleCompleteTrip}
                  className="text-xs gap-1.5 bg-red-700 hover:bg-red-800"
                >
                  <Flag size={14} /> Complete Route
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-6">
              {/* Left Column: Stops checklist */}
              <div className="lg:col-span-5 space-y-4">
                <h3 className="font-semibold text-lg flex items-center justify-between">
                  <span>Optimized Stops ({stops.filter((s) => s.status !== 'SKIPPED').length})</span>
                  <span className="text-xs text-brand-400 font-semibold">{activeTrip.plannedDistanceKm || 9.2} km total</span>
                </h3>

                <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
                  {stops.map((stop, index) => {
                    const isArrived = stop.status === 'ARRIVED'
                    const isPickedUp = stop.status === 'PICKED_UP'
                    const isSkipped = stop.status === 'SKIPPED'
                    return (
                      <div
                        key={stop.id}
                        className={`p-3.5 rounded-xl border transition-all ${
                          isPickedUp || isArrived
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                            : isSkipped
                            ? 'bg-slate-800/40 border-slate-700/50 opacity-50'
                            : 'bg-slate-900/60 border-slate-700 hover:border-brand-500/50'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2.5">
                            <span
                              className={`flex items-center justify-center w-6 h-6 rounded-full font-bold text-xs mt-0.5 ${
                                isPickedUp
                                  ? 'bg-emerald-500 text-white'
                                  : isSkipped
                                  ? 'bg-slate-700 text-slate-400'
                                  : 'bg-brand-500/20 text-brand-400'
                              }`}
                            >
                              {isSkipped ? '✕' : index + 1}
                            </span>
                            <div>
                              <p className="font-medium text-sm text-slate-100">{stop.name}</p>
                              <p className="text-xs text-slate-400 truncate max-w-[200px]">{stop.address}</p>
                              {stop.plannedEta && !isSkipped && (
                                <p className="text-xs text-brand-400 mt-1 flex items-center gap-1">
                                  <Clock size={12} /> ETA:{' '}
                                  {new Date(stop.plannedEta).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>
                              )}
                              {isSkipped && <p className="text-[11px] text-red-400 mt-0.5">Absent - Stop Skipped</p>}
                            </div>
                          </div>

                          {!isPickedUp && !isArrived && !isSkipped && (
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="default"
                                className="h-8 px-2.5 text-xs bg-emerald-600 hover:bg-emerald-500"
                                onClick={() => handleMarkStop(stop.id, 'PICKED_UP')}
                              >
                                <Check size={14} className="mr-1" /> Picked
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 px-2 text-xs border-slate-700 hover:bg-slate-800"
                                title="Skip stop"
                                onClick={() => handleMarkStop(stop.id, 'SKIPPED')}
                              >
                                <SkipForward size={14} />
                              </Button>
                            </div>
                          )}

                          {isPickedUp && (
                            <span className="text-xs text-emerald-400 font-medium px-2 py-1 bg-emerald-950/60 rounded">
                              ✓ Picked Up
                            </span>
                          )}
                          {isSkipped && (
                            <span className="text-xs text-slate-400 font-medium px-2 py-1 bg-slate-800 rounded">
                              Skipped
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })}

                  {/* Destination */}
                  <div className="p-3.5 rounded-xl border border-dashed border-purple-500/40 bg-purple-500/5">
                    <div className="flex items-center gap-2 text-purple-400 font-medium text-sm">
                      <MapPin size={16} /> Destination: {selectedGroup?.destinations?.[0]?.name || 'PSG Tech & Sarvajana Campus'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Live Map with Blue Path */}
              <div className="lg:col-span-7 h-[450px]">
                <LiveMap
                  driverLocation={vanLocation}
                  stops={stops}
                  destination={selectedGroup?.destinations?.[0]}
                />
              </div>
            </div>
          </Card>
        </div>
      ) : (
        /* Pre-trip Route & Attendance Summary */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-xl font-semibold">Your Assigned Coimbatore Route</h2>
            {groups.map((group) => (
              <Card key={group.id} className="border-slate-700 bg-slate-900/40">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg text-slate-100">{group.name}</CardTitle>
                      <p className="text-xs text-slate-400 mt-1">
                        Code: <span className="font-mono text-brand-400">{group.inviteCode}</span>
                      </p>
                    </div>
                    <span className="px-2.5 py-1 bg-brand-500/20 text-brand-400 rounded-full text-xs font-semibold">
                      {group._count?.members || group.members?.length || 5} Enrolled
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-slate-300">{group.description}</p>

                  <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between text-sm">
                    <span className="text-slate-400">Destination:</span>
                    <span className="font-medium text-slate-200">
                      {group.destinations?.[0]?.name || 'PSG Tech & Sarvajana Campus, Peelamedu'}
                    </span>
                  </div>

                  <div className="pt-2">
                    <Button
                      className="w-full gap-2 bg-gradient-brand text-white shadow-glow py-3"
                      disabled={startingTrip || presentCount === 0}
                      onClick={() => handleStartTrip(group)}
                    >
                      <Play size={18} /> {startingTrip ? 'Optimizing 2-Opt Route...' : `Start Morning Route (${presentCount} Present)`}
                    </Button>
                    {presentCount === 0 && (
                      <p className="text-xs text-amber-400 text-center mt-2 flex items-center justify-center gap-1">
                        <AlertCircle size={12} /> No students have marked present yet for today.
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Today's Student Roster Card */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Today's Attendance</h2>
            <Card className="border-slate-700 bg-slate-900/40">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-slate-300">Live Status</span>
                  <span className="text-xs text-slate-500">{todayAttendance.length} students</span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                  {todayAttendance.map((item, idx) => (
                    <div key={item.id || idx} className="p-2.5 rounded-lg bg-slate-800/50 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center font-bold text-xs text-slate-200">
                          {item.student?.name?.[0] || 'S'}
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-200">{item.student?.name}</p>
                          <p className="text-[10px] text-slate-400">{item.student?.phone || 'No phone'}</p>
                        </div>
                      </div>
                      <span
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                          item.status === 'PRESENT'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : item.status === 'ABSENT'
                            ? 'bg-red-500/20 text-red-400'
                            : 'bg-slate-700 text-slate-300'
                        }`}
                      >
                        {item.status}
                      </span>
                    </div>
                  ))}
                  {todayAttendance.length === 0 && (
                    <p className="text-xs text-slate-500 text-center py-4">No attendance records found for today.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}

export default DriverDashboard

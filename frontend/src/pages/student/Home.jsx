import React, { useState, useEffect } from 'react'
import { useAuthStore } from '../../store/authStore'
import { Card, CardContent } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { MapPin, Clock, Calendar, Check, X, Phone, Navigation, ShieldCheck, AlertCircle, RefreshCw } from 'lucide-react'
import api from '../../api/axios'
import { getSocket } from '../../lib/socket'
import LiveMap from '../../components/map/LiveMap'
import { showNotification } from '../../lib/notifications'

const StudentHome = () => {
  const { user } = useAuthStore()
  const [attendance, setAttendance] = useState(null)
  const [group, setGroup] = useState(null)
  const [activeTrip, setActiveTrip] = useState(null)
  const [loading, setLoading] = useState(true)
  const [updatingAttendance, setUpdatingAttendance] = useState(false)
  // Default driver location fallback: Coimbatore, Tamil Nadu
  const [driverLocation, setDriverLocation] = useState({ lat: 11.0183, lng: 76.9644 })
  const [etaMinutes, setEtaMinutes] = useState(null)
  const [lateAbsenceSuccess, setLateAbsenceSuccess] = useState(false)

  const loadData = async () => {
    try {
      setLoading(true)
      const groupRes = await api.get('/groups/my')
      const groups = groupRes.data.data || []
      if (groups.length > 0) {
        const studentGroup = groups[0]
        setGroup(studentGroup)

        // Load today's attendance for student
        const attRes = await api.get(`/attendance/group/${studentGroup.id}/today`)
        const userAtt = (attRes.data.data || []).find((a) => a.studentId === user.id)
        if (userAtt) {
          setAttendance(userAtt.status)
        }

        // Check active trip
        const tripRes = await api.get(`/trips/active/${studentGroup.id}`)
        if (tripRes.data.data) {
          const trip = tripRes.data.data
          setActiveTrip(trip)

          // Find student stop
          const myStop = trip.stops?.find((s) => s.studentId === user.id)
          if (myStop?.plannedEta && myStop.status !== 'SKIPPED') {
            const diffMin = Math.max(1, Math.round((new Date(myStop.plannedEta).getTime() - Date.now()) / (1000 * 60)))
            setEtaMinutes(diffMin)
          }
        }
      }
    } catch (err) {
      console.error('Error loading student dashboard:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Real-time socket listeners
  useEffect(() => {
    const socket = getSocket()
    if (!socket || !group) return

    socket.emit('join:group', group.id)
    if (activeTrip?.id) {
      socket.emit('join:trip', activeTrip.id)
    }

    const handleTripStarted = ({ tripId }) => {
      showNotification('Van Route Started 🚐', {
        body: `Driver has started the morning route in Coimbatore. Check your live ETA!`,
      })
      api.get(`/trips/${tripId}`).then((res) => {
        const trip = res.data.data
        setActiveTrip(trip)
        const myStop = trip.stops?.find((s) => s.studentId === user.id)
        if (myStop?.plannedEta) {
          const diffMin = Math.max(1, Math.round((new Date(myStop.plannedEta).getTime() - Date.now()) / (1000 * 60)))
          setEtaMinutes(diffMin)
        }
      })
    }

    const handleLocationUpdate = (data) => {
      setDriverLocation({ lat: data.lat, lng: data.lng })
      if (data.etaMinutes) {
        setEtaMinutes(data.etaMinutes)
      }
    }

    const handleStopUpdate = (data) => {
      if (data.studentId === user.id) {
        if (data.status === 'ARRIVED' || data.status === 'PICKED_UP') {
          showNotification('Van Arrived! 📍', {
            body: 'The van has arrived at your pickup spot in Coimbatore. Please board now.',
          })
        }
      }
      if (data.tripId) {
        api.get(`/trips/${data.tripId}`).then((res) => setActiveTrip(res.data.data))
      }
    }

    const handleTripRecalculated = (data) => {
      if (data.updatedTrip) {
        setActiveTrip(data.updatedTrip)
      }
    }

    const handleGeofence = (data) => {
      if (data.studentId === user.id) {
        showNotification('Van Approaching! ⏳', {
          body: 'Your Coimbatore transport van is within 500 meters of your pickup spot (~2 mins).',
        })
      }
    }

    const handleEmergency = (data) => {
      showNotification('⚠️ Transport SOS Alert', {
        body: `Emergency reported by driver: ${data.reason || 'Assistance dispatched'}`,
      })
      alert(`⚠️ EMERGENCY ALERT: Driver triggered SOS. Reason: ${data.reason || 'Assistance requested'}`)
    }

    const handleTripEnded = () => {
      showNotification('Trip Completed ✅', {
        body: 'Morning transport route has safely reached Coimbatore destination.',
      })
      setActiveTrip(null)
      loadData()
    }

    socket.on('trip:started', handleTripStarted)
    socket.on('location:update', handleLocationUpdate)
    socket.on('trip:stop_update', handleStopUpdate)
    socket.on('trip:recalculated', handleTripRecalculated)
    socket.on('trip:geofence_entered', handleGeofence)
    socket.on('trip:emergency', handleEmergency)
    socket.on('trip:completed', handleTripEnded)

    return () => {
      socket.off('trip:started', handleTripStarted)
      socket.off('location:update', handleLocationUpdate)
      socket.off('trip:stop_update', handleStopUpdate)
      socket.off('trip:recalculated', handleTripRecalculated)
      socket.off('trip:geofence_entered', handleGeofence)
      socket.off('trip:emergency', handleEmergency)
      socket.off('trip:completed', handleTripEnded)
    }
  }, [group, user, activeTrip?.id])

  const handleMarkAttendance = async (status) => {
    if (!group) return
    try {
      setUpdatingAttendance(true)
      const res = await api.post('/attendance/mark', {
        groupId: group.id,
        status,
        date: new Date().toISOString().split('T')[0],
      })
      setAttendance(status)

      // If marked absent late while trip was active
      if (status === 'ABSENT' && activeTrip) {
        setLateAbsenceSuccess(true)
        showNotification('Absence Informed ✅', {
          body: 'Your absence was recorded. Route was instantly re-optimized to save time.',
        })
        setTimeout(() => setLateAbsenceSuccess(false), 5000)
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update attendance')
    } finally {
      setUpdatingAttendance(false)
    }
  }

  const myStop = activeTrip?.stops?.find((s) => s.studentId === user.id)
  const isPickedUp = myStop?.status === 'ARRIVED' || myStop?.status === 'PICKED_UP'
  const isSkipped = myStop?.status === 'SKIPPED' || attendance === 'ABSENT'

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-6">
      <div className="text-center pt-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-full text-xs font-semibold mb-2">
          <MapPin size={13} /> Coimbatore, Tamil Nadu
        </div>
        <h1 className="text-2xl font-bold">Hello, {user?.name}</h1>
        <p className="text-slate-400 text-sm">{group?.name || 'Coimbatore Student Transport'}</p>
      </div>

      {/* Late Absence Notification Toast */}
      {lateAbsenceSuccess && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm flex items-center gap-2 shadow-lg animate-fade-in">
          <Check size={18} className="text-emerald-400 flex-shrink-0" />
          <span>
            <strong>Late absence accepted!</strong> Your pickup stop was skipped and your driver's route was re-optimized.
          </span>
        </div>
      )}

      {/* Attendance Toggle Card */}
      <Card className="overflow-hidden border-brand-500/30 bg-slate-900/50 shadow-glow">
        <div className="bg-brand-500/10 p-4 border-b border-brand-500/20 flex items-center justify-between">
          <div className="flex items-center gap-2 text-brand-400 font-semibold text-sm">
            <Calendar size={18} />
            Today's Attendance Status
          </div>
          {attendance && (
            <span
              className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                attendance === 'PRESENT' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
              }`}
            >
              {attendance}
            </span>
          )}
        </div>
        <CardContent className="p-6">
          <p className="text-sm text-slate-300 mb-4 text-center">
            Are you taking the van today? Even if informing late, marking absent will immediately re-optimize the van's path!
          </p>

          <div className="flex gap-4">
            <Button
              variant={attendance === 'PRESENT' ? 'default' : 'outline'}
              className={`flex-1 gap-2 h-12 ${
                attendance === 'PRESENT' ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'border-slate-700'
              }`}
              disabled={updatingAttendance}
              onClick={() => handleMarkAttendance('PRESENT')}
            >
              <Check size={18} /> Present
            </Button>
            <Button
              variant={attendance === 'ABSENT' ? 'destructive' : 'outline'}
              className={`flex-1 gap-2 h-12 ${
                attendance === 'ABSENT' ? 'bg-red-600 hover:bg-red-500 text-white' : 'border-slate-700'
              }`}
              disabled={updatingAttendance}
              onClick={() => handleMarkAttendance('ABSENT')}
            >
              <X size={18} /> Absent (Late Inform)
            </Button>
          </div>

          {activeTrip && attendance === 'PRESENT' && (
            <p className="text-xs text-brand-400/90 text-center mt-3 flex items-center justify-center gap-1">
              <Navigation size={12} className="animate-spin" /> Live route in progress. If plans changed, click 'Absent' to optimize the route.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Driver & Trip Status Card */}
      {group?.driver && (
        <Card className="border-slate-800 bg-slate-900/40">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-brand-500/20 text-brand-400 flex items-center justify-center font-bold text-base">
                {group.driver.name?.[0] || 'D'}
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-200">{group.driver.name}</p>
                <p className="text-xs text-slate-400">Assigned Driver • Coimbatore Route</p>
              </div>
            </div>
            {group.driver.phone && (
              <a
                href={`tel:${group.driver.phone}`}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-brand-400 rounded-lg text-xs font-medium transition-colors"
              >
                <Phone size={14} /> Call Driver
              </a>
            )}
          </CardContent>
        </Card>
      )}

      {/* Live Route Tracking Card */}
      {attendance === 'PRESENT' && (
        <Card className="border-slate-800 bg-slate-900/40 overflow-hidden">
          <CardContent className="p-6">
            {!activeTrip ? (
              <div className="text-center space-y-4 py-4">
                <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto text-slate-400">
                  <Clock size={32} />
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-slate-200">Trip Scheduled</h3>
                  <p className="text-slate-400 text-sm max-w-sm mx-auto mt-1">
                    Your driver hasn't departed yet. As soon as the route starts in Coimbatore, live ETAs and the blue route map will appear here.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="text-center space-y-2">
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-brand-500/20 text-brand-400 rounded-full text-xs font-semibold animate-pulse">
                    <Navigation size={12} /> Coimbatore Van is on the way!
                  </div>

                  {isPickedUp ? (
                    <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl">
                      <div className="flex items-center justify-center gap-2 text-emerald-400 font-bold text-lg">
                        <ShieldCheck size={24} /> You are on board!
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        Heading to {group?.destinations?.[0]?.name || 'PSG Tech & Sarvajana Campus, Coimbatore'}
                      </p>
                    </div>
                  ) : isSkipped ? (
                    <div className="p-4 bg-slate-800/60 border border-slate-700 rounded-2xl">
                      <p className="text-sm font-semibold text-slate-300">Marked Absent for Today's Route</p>
                      <p className="text-xs text-slate-500 mt-1">Stop removed from driver's sequence.</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-xs text-slate-400">Expected pickup at your stop:</p>
                      <p className="text-3xl font-extrabold text-brand-500 mt-1">
                        {etaMinutes ? `~${etaMinutes} mins` : 'Arriving Soon'}
                      </p>
                      {myStop?.plannedEta && (
                        <p className="text-xs text-slate-400 mt-1">
                          Est. Time: {new Date(myStop.plannedEta).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Map View with Blue Route */}
                <div className="h-64 rounded-xl overflow-hidden border border-slate-800">
                  <LiveMap
                    driverLocation={driverLocation}
                    stops={activeTrip.stops || []}
                    destination={group?.destinations?.[0]}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default StudentHome

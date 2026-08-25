import React, { useState, useEffect } from 'react'
import { useAuthStore } from '../../store/authStore'
import { Card, CardContent } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { MapPin, Clock, Calendar, Check, X, Phone, Navigation, ShieldCheck, AlertCircle } from 'lucide-react'
import api from '../../api/axios'
import { getSocket } from '../../lib/socket'
import LiveMap from '../../components/map/LiveMap'

const StudentHome = () => {
  const { user } = useAuthStore()
  const [attendance, setAttendance] = useState(null)
  const [group, setGroup] = useState(null)
  const [activeTrip, setActiveTrip] = useState(null)
  const [loading, setLoading] = useState(true)
  const [updatingAttendance, setUpdatingAttendance] = useState(false)
  const [driverLocation, setDriverLocation] = useState(null)
  const [etaMinutes, setEtaMinutes] = useState(null)

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
        const userAtt = (attRes.data.data || []).find(a => a.studentId === user.id)
        if (userAtt) {
          setAttendance(userAtt.status)
        }

        // Check active trip
        const tripRes = await api.get(`/trips/active/${studentGroup.id}`)
        if (tripRes.data.data) {
          const trip = tripRes.data.data
          setActiveTrip(trip)
          
          // Find student stop
          const myStop = trip.stops?.find(s => s.studentId === user.id)
          if (myStop?.plannedEta) {
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

    const handleTripStarted = ({ tripId }) => {
      api.get(`/trips/${tripId}`).then(res => {
        const trip = res.data.data
        setActiveTrip(trip)
        const myStop = trip.stops?.find(s => s.studentId === user.id)
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

    const handleStopArrived = (data) => {
      if (data.studentId === user.id) {
        alert('🎉 Van has arrived at your pickup spot!')
      }
    }

    const handleTripEnded = () => {
      setActiveTrip(null)
      setDriverLocation(null)
      loadData()
    }

    socket.on('trip:started', handleTripStarted)
    socket.on('trip:location_updated', handleLocationUpdate)
    socket.on('trip:stop_arrived', handleStopArrived)
    socket.on('trip:ended', handleTripEnded)

    return () => {
      socket.off('trip:started', handleTripStarted)
      socket.off('trip:location_updated', handleLocationUpdate)
      socket.off('trip:stop_arrived', handleStopArrived)
      socket.off('trip:ended', handleTripEnded)
    }
  }, [group, user])

  const handleMarkAttendance = async (status) => {
    if (!group) return
    try {
      setUpdatingAttendance(true)
      await api.post('/attendance/mark', {
        groupId: group.id,
        status,
        date: new Date().toISOString().split('T')[0],
      })
      setAttendance(status)
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update attendance')
    } finally {
      setUpdatingAttendance(false)
    }
  }

  const myStop = activeTrip?.stops?.find(s => s.studentId === user.id)
  const isPickedUp = myStop?.status === 'ARRIVED'

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-6">
      <div className="text-center pt-2">
        <h1 className="text-2xl font-bold">Hello, {user?.name}</h1>
        <p className="text-slate-400 text-sm">{group?.name || 'Your Assigned School Transport'}</p>
      </div>

      {/* Attendance Toggle Card */}
      <Card className="overflow-hidden border-brand-500/30 bg-slate-900/50 shadow-glow">
        <div className="bg-brand-500/10 p-4 border-b border-brand-500/20 flex items-center justify-between">
          <div className="flex items-center gap-2 text-brand-400 font-semibold text-sm">
            <Calendar size={18} />
            Today's Attendance Status
          </div>
          {attendance && (
            <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
              attendance === 'PRESENT' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
            }`}>
              {attendance}
            </span>
          )}
        </div>
        <CardContent className="p-6">
          <p className="text-sm text-slate-300 mb-4 text-center">
            Are you taking the van today? (Locks automatically when driver begins route)
          </p>
          
          <div className="flex gap-4">
            <Button
              variant={attendance === 'PRESENT' ? 'default' : 'outline'}
              className={`flex-1 gap-2 h-12 ${attendance === 'PRESENT' ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'border-slate-700'}`}
              disabled={updatingAttendance || !!activeTrip}
              onClick={() => handleMarkAttendance('PRESENT')}
            >
              <Check size={18} /> Present
            </Button>
            <Button
              variant={attendance === 'ABSENT' ? 'destructive' : 'outline'}
              className={`flex-1 gap-2 h-12 ${attendance === 'ABSENT' ? 'bg-red-600 hover:bg-red-500 text-white' : 'border-slate-700'}`}
              disabled={updatingAttendance || !!activeTrip}
              onClick={() => handleMarkAttendance('ABSENT')}
            >
              <X size={18} /> Absent
            </Button>
          </div>

          {activeTrip && (
            <p className="text-xs text-amber-400/90 text-center mt-3 flex items-center justify-center gap-1">
              <AlertCircle size={12} /> Route in progress: Attendance is locked for today.
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
                <p className="text-xs text-slate-400">Assigned Driver</p>
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
                    Your driver hasn't departed yet. As soon as the route starts, live ETAs and map tracking will appear here.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="text-center space-y-2">
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-brand-500/20 text-brand-400 rounded-full text-xs font-semibold animate-pulse">
                    <Navigation size={12} /> Van is on the way!
                  </div>
                  
                  {isPickedUp ? (
                    <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl">
                      <div className="flex items-center justify-center gap-2 text-emerald-400 font-bold text-lg">
                        <ShieldCheck size={24} /> You are on board!
                      </div>
                      <p className="text-xs text-slate-400 mt-1">Heading to {group?.destinations?.[0]?.name || 'Destination'}</p>
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

                {/* Map View */}
                <div className="h-64 rounded-xl overflow-hidden">
                  <LiveMap
                    driverLocation={driverLocation || { lat: 12.9141, lng: 77.6101 }}
                    stops={activeTrip.stops || []}
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

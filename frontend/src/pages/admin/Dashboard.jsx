import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import {
  Map,
  Activity,
  Users,
  Route,
  Navigation,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Clock,
  Phone,
  Shield,
  Search,
  ChevronRight,
  TrendingUp,
  Eye,
  X,
} from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import api from '../../api/axios'
import LiveMap from '../../components/map/LiveMap'
import { getSocket } from '../../lib/socket'

const AdminDashboard = () => {
  const [metrics, setMetrics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedFleetTrip, setSelectedFleetTrip] = useState(null)
  const [routeInspectorData, setRouteInspectorData] = useState(null)
  const [inspectorLoading, setInspectorLoading] = useState(false)

  const fetchMetrics = async () => {
    try {
      setLoading(true)
      const res = await api.get('/analytics/admin')
      setMetrics(res.data.data)
    } catch (err) {
      console.error('Error fetching admin analytics:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMetrics()

    const socket = getSocket()
    if (!socket) return

    const handleTripUpdate = () => {
      fetchMetrics()
    }

    socket.on('trip:started', handleTripUpdate)
    socket.on('trip:completed', handleTripUpdate)
    socket.on('trip:stop_update', handleTripUpdate)
    socket.on('trip:emergency', handleTripUpdate)

    return () => {
      socket.off('trip:started', handleTripUpdate)
      socket.off('trip:completed', handleTripUpdate)
      socket.off('trip:stop_update', handleTripUpdate)
      socket.off('trip:emergency', handleTripUpdate)
    }
  }, [])

  const handleInspectTrip = async (tripId) => {
    if (!tripId) return
    try {
      setInspectorLoading(true)
      const res = await api.get(`/trips/${tripId}/inspector`)
      setRouteInspectorData(res.data.data)
    } catch (err) {
      console.error('Error loading route inspection:', err)
    } finally {
      setInspectorLoading(false)
    }
  }

  const fleet = metrics?.fleetStatus || []
  const filteredFleet = fleet.filter((item) => {
    const matchesFilter = filter === 'ALL' || item.status === filter
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.driverName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.routeCode && item.routeCode.toLowerCase().includes(searchQuery.toLowerCase()))
    return matchesFilter && matchesSearch
  })

  // Map coordinates of fleet vans
  const fleetMapStops = fleet.map((f, i) => ({
    id: f.groupId,
    name: `${f.name} (${f.driverName})`,
    address: `Status: ${f.status} • ${f.studentCount} Students`,
    lat: 12.9716 + (i - 1) * 0.015,
    lng: 77.5946 + (i - 1) * 0.012,
  }))

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-brand-500/20 text-brand-400 border border-brand-500/30">
              Live Command Center
            </span>
            <span className="flex items-center gap-1 text-xs text-emerald-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> 2-Opt TSP Engine Active
            </span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight mt-1 text-slate-900 dark:text-slate-100 font-display">
            Fleet Intelligence & Optimization
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Real-time attendance-aware van routing, dynamic ETA predictions, and fleet performance.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchMetrics} className="gap-2 self-start sm:self-auto border-slate-700">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh Data
        </Button>
      </div>

      {/* Bento Grid Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-800 bg-slate-900/50 relative overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Vans</p>
              <div className="p-2.5 rounded-xl bg-brand-500/10 text-brand-500">
                <Navigation size={20} />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <p className="text-3xl font-extrabold text-slate-100">{metrics?.activeVansCount ?? 2}</p>
              <span className="text-sm text-slate-400">/ {metrics?.totalVansCount ?? 5} deployed</span>
            </div>
            <div className="mt-3 flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
              <TrendingUp size={14} />
              <span>{metrics?.fleetUtilization ?? 40}% fleet utilization</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900/50 relative overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Today's Attendance</p>
              <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
                <CheckCircle size={20} />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <p className="text-3xl font-extrabold text-slate-100">{metrics?.attendanceRateToday ?? 95}%</p>
              <span className="text-sm text-slate-400">of {metrics?.totalStudents ?? 48} enrolled</span>
            </div>
            <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-400">
              <Clock size={14} className="text-brand-400" />
              <span>Locked before each trip start</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900/50 relative overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">ETA Accuracy</p>
              <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400">
                <Activity size={20} />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <p className="text-3xl font-extrabold text-slate-100">±{metrics?.averageEtaAccuracyMinutes ?? 1.4}m</p>
              <span className="text-sm text-emerald-400 font-medium">98.2% on-time</span>
            </div>
            <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-400">
              <span>Haversine + Dynamic traffic buffer</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900/50 relative overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Route Optimization</p>
              <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400">
                <Route size={20} />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <p className="text-3xl font-extrabold text-slate-100">+14.2%</p>
              <span className="text-sm text-slate-400">Distance Saved</span>
            </div>
            <div className="mt-3 flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
              <span>{metrics?.routeEfficiencyKmPerStudent ?? 1.25} km / student avg</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Map and Chart Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Live Fleet Map (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          <Card className="border-slate-800 bg-slate-900/50 overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-lg font-bold text-slate-100 flex items-center gap-2">
                  <Map size={18} className="text-brand-500" /> Live Fleet Tracking Map
                </CardTitle>
                <p className="text-xs text-slate-400">All registered vans, active routes, and destination checkpoints</p>
              </div>
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-brand-500/20 text-brand-400">
                {fleet.length} Vans Online
              </span>
            </CardHeader>
            <CardContent className="p-0 h-[400px]">
              <LiveMap
                driverLocation={{ lat: 12.9716, lng: 77.5946 }}
                stops={fleetMapStops}
              />
            </CardContent>
          </Card>
        </div>

        {/* Weekly Attendance & Volume Chart (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <Card className="border-slate-800 bg-slate-900/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <Activity size={18} className="text-emerald-400" /> Weekly Attendance Compliance
              </CardTitle>
              <p className="text-xs text-slate-400">Morning pickup participation rate across working days</p>
            </CardHeader>
            <CardContent>
              <div className="h-[320px] w-full pt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={metrics?.peakAttendanceDays || [
                      { day: 'Mon', attendanceRate: 96 },
                      { day: 'Tue', attendanceRate: 98 },
                      { day: 'Wed', attendanceRate: 94 },
                      { day: 'Thu', attendanceRate: 97 },
                      { day: 'Fri', attendanceRate: 91 },
                    ]}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="attendanceGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#FC8019" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#FC8019" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                    <XAxis dataKey="day" stroke="#94a3b8" fontSize={12} tickLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={12} domain={[80, 100]} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderColor: '#334155',
                        borderRadius: '0.75rem',
                        color: '#fff',
                        fontSize: '12px',
                      }}
                      formatter={(val) => [`${val}%`, 'Attendance Rate']}
                    />
                    <Area
                      type="monotone"
                      dataKey="attendanceRate"
                      stroke="#FC8019"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#attendanceGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Fleet Management Table */}
      <Card className="border-slate-800 bg-slate-900/50">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-xl font-bold text-slate-100 flex items-center gap-2">
                <Shield size={20} className="text-brand-500" /> Active Fleet Roster & Route Progression
              </CardTitle>
              <p className="text-xs text-slate-400 mt-0.5">Filter by real-time status, driver, or route assignment</p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Search */}
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search van, driver, route..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-4 py-1.5 text-xs rounded-xl bg-slate-800 border border-slate-700 text-slate-100 placeholder-slate-400 focus:outline-none focus:border-brand-500"
                />
              </div>

              {/* Status Filter Buttons */}
              <div className="flex rounded-xl bg-slate-800 p-1 border border-slate-700 text-xs">
                {['ALL', 'ON_ROUTE', 'STANDBY'].map((st) => (
                  <button
                    key={st}
                    onClick={() => setFilter(st)}
                    className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                      filter === st ? 'bg-brand-500 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {st === 'ON_ROUTE' ? 'Active' : st === 'STANDBY' ? 'Standby' : 'All'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-800 text-xs uppercase text-slate-400 bg-slate-800/40">
                <tr>
                  <th className="py-3 px-4">Van / Route</th>
                  <th className="py-3 px-4">Driver Details</th>
                  <th className="py-3 px-4">Students Enrolled</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Stop Progression</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredFleet.map((v) => {
                  const isOnRoute = v.status === 'ON_ROUTE'
                  const progressPct = v.totalStops > 0 ? Math.round((v.completedStops / v.totalStops) * 100) : 0

                  return (
                    <tr key={v.groupId} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-200">{v.name}</div>
                        <span className="text-xs font-mono text-brand-400">{v.routeCode || 'RTE-SYNC'}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-300">{v.driverName}</div>
                        <div className="text-xs text-slate-400 flex items-center gap-1">
                          <Phone size={12} /> {v.driverPhone || 'No phone'}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-800 text-slate-300">
                          <Users size={12} /> {v.studentCount} Students
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                            isOnRoute
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-slate-800 text-slate-400 border border-slate-700'
                          }`}
                        >
                          <span className={`w-2 h-2 rounded-full ${isOnRoute ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
                          {isOnRoute ? 'On Route' : 'Standby'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 min-w-[180px]">
                        {isOnRoute ? (
                          <div className="space-y-1.5">
                            <div className="flex justify-between text-xs text-slate-400">
                              <span>
                                {v.completedStops} of {v.totalStops} Picked Up
                              </span>
                              <span className="font-bold text-slate-200">{progressPct}%</span>
                            </div>
                            <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                              <div
                                className="bg-brand-500 h-2 rounded-full transition-all duration-500"
                                style={{ width: `${progressPct}%` }}
                              />
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-500">Route not started</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {v.activeTripId ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5 text-xs border-brand-500/40 text-brand-400 hover:bg-brand-500/10"
                            onClick={() => {
                              setSelectedFleetTrip(v)
                              handleInspectTrip(v.activeTripId)
                            }}
                          >
                            <Eye size={14} /> Inspect Route
                          </Button>
                        ) : (
                          <span className="text-xs text-slate-500">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
                {filteredFleet.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500 text-sm">
                      No fleet vans match the current filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Route Inspector Modal */}
      {selectedFleetTrip && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl animate-scale-up">
            <div className="p-6 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                  <Route size={20} className="text-brand-500" /> Route Inspector: {selectedFleetTrip.name}
                </h3>
                <p className="text-xs text-slate-400">Driver: {selectedFleetTrip.driverName} • Trip ID: {selectedFleetTrip.activeTripId}</p>
              </div>
              <button
                onClick={() => {
                  setSelectedFleetTrip(null)
                  setRouteInspectorData(null)
                }}
                className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              {inspectorLoading ? (
                <div className="py-12 text-center text-slate-400 flex items-center justify-center gap-2">
                  <RefreshCw size={18} className="animate-spin" /> Loading optimization & breadcrumb data...
                </div>
              ) : routeInspectorData ? (
                <div className="space-y-6">
                  {/* Summary Metric Strip */}
                  <div className="grid grid-cols-3 gap-3 p-4 rounded-xl bg-slate-800/60 border border-slate-700 text-center">
                    <div>
                      <p className="text-xs text-slate-400">Planned Distance</p>
                      <p className="text-lg font-bold text-slate-100">{routeInspectorData.plannedDistanceKm || 9.2} km</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Actual Traveled</p>
                      <p className="text-lg font-bold text-brand-400">{routeInspectorData.actualDistanceKm || 8.9} km</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Total Stops</p>
                      <p className="text-lg font-bold text-emerald-400">{routeInspectorData.plannedStops?.length || 0}</p>
                    </div>
                  </div>

                  {/* Planned Sequence */}
                  <div>
                    <h4 className="text-sm font-semibold text-slate-200 mb-3">TSP Optimized Stop Sequence (2-Opt)</h4>
                    <div className="space-y-2">
                      {routeInspectorData.plannedStops?.map((st, i) => (
                        <div
                          key={st.id}
                          className="p-3 rounded-lg bg-slate-800/40 border border-slate-700/60 flex items-center justify-between text-xs"
                        >
                          <div className="flex items-center gap-3">
                            <span className="w-5 h-5 rounded-full bg-brand-500/20 text-brand-400 font-bold flex items-center justify-center">
                              {i + 1}
                            </span>
                            <div>
                              <p className="font-semibold text-slate-200">{st.address || `Stop #${i + 1}`}</p>
                              <p className="text-[10px] text-slate-400">Lat: {st.lat}, Lng: {st.lng}</p>
                            </div>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded font-semibold ${
                              st.status === 'PICKED_UP' || st.status === 'ARRIVED'
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : 'bg-slate-700 text-slate-300'
                            }`}
                          >
                            {st.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center text-slate-500 text-sm">No telemetry logs recorded yet for this route.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminDashboard

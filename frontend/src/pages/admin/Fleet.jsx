import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Navigation, Users, Shield, Phone, MapPin, RefreshCw, Search, CheckCircle } from 'lucide-react'
import api from '../../api/axios'

const AdminFleet = () => {
  const [fleet, setFleet] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const fetchFleet = async () => {
    try {
      setLoading(true)
      const res = await api.get('/analytics/admin')
      setFleet(res.data.data?.fleetStatus || [])
    } catch (err) {
      console.error('Error loading fleet:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchFleet()
  }, [])

  const filtered = fleet.filter(
    (v) =>
      v.name.toLowerCase().includes(search.toLowerCase()) ||
      v.driverName.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 font-display">Fleet Directory & Assignments</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Overview of all institution vehicles, assigned drivers, and active operating routes.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchFleet} className="gap-2 border-slate-700">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
        </Button>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Filter by route name or driver..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 text-sm rounded-xl bg-slate-900 border border-slate-800 text-slate-100 placeholder-slate-400 focus:outline-none focus:border-brand-500"
        />
      </div>

      {/* Fleet Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((van) => (
          <Card key={van.groupId} className="border-slate-800 bg-slate-900/50">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-base text-slate-100">{van.name}</CardTitle>
                  <span className="text-xs font-mono text-brand-400">{van.routeCode || 'KA-VAN-01'}</span>
                </div>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    van.status === 'ON_ROUTE'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {van.status === 'ON_ROUTE' ? 'Active On Route' : 'Standby'}
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/60 space-y-2">
                <div className="flex items-center justify-between text-slate-300">
                  <span className="text-slate-400">Assigned Driver:</span>
                  <span className="font-semibold text-slate-200">{van.driverName}</span>
                </div>
                <div className="flex items-center justify-between text-slate-300">
                  <span className="text-slate-400">Contact:</span>
                  <span className="text-slate-200">{van.driverPhone || '+91 98765 00000'}</span>
                </div>
                <div className="flex items-center justify-between text-slate-300 pt-1 border-t border-slate-700/50">
                  <span className="text-slate-400">Enrolled Students:</span>
                  <span className="font-bold text-brand-400">{van.studentCount} Students</span>
                </div>
              </div>

              {van.status === 'ON_ROUTE' && (
                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between text-slate-400 text-[11px]">
                    <span>Pickup Progression</span>
                    <span className="text-emerald-400 font-bold">
                      {van.completedStops} / {van.totalStops} Stops
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-brand-500 h-1.5 rounded-full"
                      style={{ width: `${van.totalStops > 0 ? (van.completedStops / van.totalStops) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}

        {filtered.length === 0 && !loading && (
          <div className="col-span-full py-12 text-center text-slate-500">
            <Navigation size={36} className="mx-auto mb-2 opacity-50" />
            <p className="font-semibold">No fleet vans found matching search.</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default AdminFleet

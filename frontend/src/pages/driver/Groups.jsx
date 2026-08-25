import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Users, Plus, Hash, MapPin, Copy, Check, RefreshCw, X, Shield } from 'lucide-react'
import api from '../../api/axios'
import LocationAutocomplete, { COIMBATORE_LANDMARKS } from '../../components/ui/LocationAutocomplete'

const DriverGroups = () => {
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [creating, setCreating] = useState(false)
  const [copiedCode, setCopiedCode] = useState(null)

  // Form State
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [destinationName, setDestinationName] = useState('PSG Tech & Sarvajana Campus, Peelamedu')
  const [destLat, setDestLat] = useState(11.0240)
  const [destLng, setDestLng] = useState(77.0028)

  const fetchGroups = async () => {
    try {
      setLoading(true)
      const res = await api.get('/groups/my')
      setGroups(res.data.data || [])
    } catch (err) {
      console.error('Error fetching driver groups:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchGroups()
  }, [])

  const handleCopy = (code) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  const handleDestinationSelect = (loc) => {
    setDestinationName(loc.address || loc.name)
    setDestLat(loc.lat)
    setDestLng(loc.lng)
  }

  const handleCreateGroup = async (e) => {
    e.preventDefault()
    try {
      setCreating(true)
      await api.post('/groups', {
        name,
        description,
        destinations: [
          {
            name: destinationName,
            lat: Number(destLat),
            lng: Number(destLng),
            address: destinationName,
          },
        ],
      })
      setShowCreateModal(false)
      setName('')
      setDescription('')
      fetchGroups()
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create group')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 font-display">Manage Coimbatore Van Groups & Routes</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Create transport groups, distribute invite codes to students/parents, and configure drop destinations in Coimbatore.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={fetchGroups} className="gap-2 border-slate-700">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </Button>
          <Button onClick={() => setShowCreateModal(true)} className="gap-2 bg-gradient-brand text-white shadow-glow">
            <Plus size={16} /> Create New Group
          </Button>
        </div>
      </div>

      {/* Group Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {groups.map((group) => (
          <Card key={group.id} className="border-slate-800 bg-slate-900/50 flex flex-col justify-between">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg text-slate-100">{group.name}</CardTitle>
                  <p className="text-xs text-slate-400 mt-1">{group.description || 'Regular morning & afternoon Coimbatore route'}</p>
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-brand-500/20 text-brand-400">
                  {group.members?.length || group._count?.members || 0} Students
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Invite Code Box */}
              <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Student Invite Code</span>
                  <span className="text-lg font-mono font-bold text-brand-400">{group.inviteCode}</span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 px-2.5 text-xs gap-1 border-slate-600"
                  onClick={() => handleCopy(group.inviteCode)}
                >
                  {copiedCode === group.inviteCode ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                  {copiedCode === group.inviteCode ? 'Copied' : 'Copy'}
                </Button>
              </div>

              {/* Destination info */}
              <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/60 text-xs space-y-1">
                <div className="flex items-center gap-1.5 text-slate-300 font-semibold">
                  <MapPin size={14} className="text-emerald-400" /> Destination Checkpoint:
                </div>
                <p className="text-slate-400 pl-5">{group.destinations?.[0]?.name || 'PSG Tech & Sarvajana Campus, Peelamedu'}</p>
              </div>

              {/* Student Roster Preview */}
              {group.members && group.members.length > 0 && (
                <div className="pt-2 border-t border-slate-800">
                  <span className="text-[11px] font-semibold text-slate-400 block mb-2">Enrolled Roster:</span>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {group.members.map((m, i) => (
                      <div key={m.id || i} className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-800/40">
                        <span className="font-medium text-slate-200">{m.student?.name || `Student ${i + 1}`}</span>
                        <span className="text-[10px] text-slate-400">{m.student?.phone || 'No phone'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}

        {groups.length === 0 && !loading && (
          <div className="col-span-full py-12 text-center text-slate-500">
            <Users size={36} className="mx-auto mb-2 opacity-50" />
            <p className="font-semibold">No transport groups created yet.</p>
            <p className="text-xs mt-1">Click "Create New Group" to establish your first Coimbatore van route.</p>
          </div>
        )}
      </div>

      {/* Create Group Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-scale-up">
            <div className="p-6 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <Shield size={18} className="text-brand-500" /> Create Coimbatore Van Route
              </h3>
              <button onClick={() => setShowCreateModal(false)} className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateGroup} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Route / Group Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Route #2 - Gandhipuram to Peelamedu"
                  className="w-full px-3 py-2 text-sm rounded-xl bg-slate-800 border border-slate-700 text-slate-100 focus:outline-none focus:border-brand-500"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Description</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Morning pickup 7:30 AM across Coimbatore, AC Van #TN-38-AB-1234"
                  className="w-full px-3 py-2 text-sm rounded-xl bg-slate-800 border border-slate-700 text-slate-100 focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700 space-y-3">
                <label className="text-xs font-bold text-slate-300 block">Drop Destination (Campus / School)</label>
                
                {/* Autocomplete for destination */}
                <LocationAutocomplete
                  value={destinationName}
                  onChange={setDestinationName}
                  onSelect={handleDestinationSelect}
                  placeholder="Search campus or landmark in Coimbatore..."
                />

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-0.5">Dest Lat</label>
                    <input
                      type="number"
                      step="0.0001"
                      value={destLat}
                      onChange={(e) => setDestLat(parseFloat(e.target.value) || 0)}
                      className="w-full px-2.5 py-1.5 text-xs font-mono rounded-lg bg-slate-900 border border-slate-700 text-slate-200"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-0.5">Dest Lng</label>
                    <input
                      type="number"
                      step="0.0001"
                      value={destLng}
                      onChange={(e) => setDestLng(parseFloat(e.target.value) || 0)}
                      className="w-full px-2.5 py-1.5 text-xs font-mono rounded-lg bg-slate-900 border border-slate-700 text-slate-200"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={creating} className="bg-gradient-brand text-white shadow-glow">
                  {creating ? 'Creating...' : 'Create Group & Generate Code'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default DriverGroups

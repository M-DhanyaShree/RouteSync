import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Users, Plus, Hash, MapPin, Check, Phone, AlertCircle, RefreshCw } from 'lucide-react'
import api from '../../api/axios'

const StudentGroups = () => {
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [inviteCode, setInviteCode] = useState('')
  const [joining, setJoining] = useState(false)
  const [joinSuccess, setJoinSuccess] = useState('')
  const [error, setError] = useState('')

  const fetchGroups = async () => {
    try {
      setLoading(true)
      const res = await api.get('/groups/my')
      setGroups(res.data.data || [])
    } catch (err) {
      console.error('Error fetching student groups:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchGroups()
  }, [])

  const handleJoinGroup = async (e) => {
    e.preventDefault()
    if (!inviteCode.trim()) return

    try {
      setJoining(true)
      setError('')
      setJoinSuccess('')
      const res = await api.post('/groups/join', { inviteCode: inviteCode.trim().toUpperCase() })
      setJoinSuccess(`Joined ${res.data.data?.name || 'group'} successfully!`)
      setInviteCode('')
      fetchGroups()
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid invite code or already joined')
    } finally {
      setJoining(false)
    }
  }

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 font-display">My Transport Groups</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Join your school van route using the invite code provided by your driver or transport operator.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchGroups} className="gap-2 self-start sm:self-auto border-slate-700">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
        </Button>
      </div>

      {/* Join Group Input Card */}
      <Card className="border-brand-500/30 bg-slate-900/50 shadow-glow">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2 text-slate-100">
            <Plus size={18} className="text-brand-500" /> Join a Van Transport Group
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleJoinGroup} className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Hash size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                placeholder="ENTER 6-DIGIT CODE (e.g. RTE101)"
                maxLength={10}
                className="w-full pl-10 pr-4 py-2.5 text-sm uppercase font-mono tracking-wider rounded-xl bg-slate-800 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500"
                required
              />
            </div>
            <Button
              type="submit"
              disabled={joining || !inviteCode.trim()}
              className="gap-2 bg-gradient-brand text-white shadow-glow px-6"
            >
              {joining ? 'Joining...' : 'Join Group'}
            </Button>
          </form>

          {joinSuccess && (
            <p className="text-xs text-emerald-400 font-semibold mt-3 flex items-center gap-1">
              <Check size={14} /> {joinSuccess}
            </p>
          )}
          {error && (
            <p className="text-xs text-red-400 font-semibold mt-3 flex items-center gap-1">
              <AlertCircle size={14} /> {error}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Group List */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-200">Enrolled Routes ({groups.length})</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {groups.map((group) => (
            <Card key={group.id} className="border-slate-800 bg-slate-900/40 hover:border-slate-700 transition-all">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-base text-slate-100">{group.name}</CardTitle>
                    <span className="text-xs font-mono text-brand-400 mt-0.5 block">Code: {group.inviteCode}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/20 text-emerald-400">
                    Active Member
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                {group.description && <p className="text-slate-400">{group.description}</p>}

                <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-2">
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="text-slate-400 flex items-center gap-1">
                      <MapPin size={12} className="text-brand-400" /> Destination:
                    </span>
                    <span className="font-semibold text-slate-200 truncate max-w-[180px]">
                      {group.destinations?.[0]?.name || 'School Campus'}
                    </span>
                  </div>

                  {group.driver && (
                    <div className="flex items-center justify-between pt-1 border-t border-slate-700/60 text-slate-300">
                      <span className="text-slate-400">Driver:</span>
                      <span className="font-medium text-slate-200 flex items-center gap-1">
                        {group.driver.name}
                        {group.driver.phone && (
                          <a href={`tel:${group.driver.phone}`} className="text-brand-400 hover:underline ml-1 flex items-center gap-0.5">
                            <Phone size={10} />
                          </a>
                        )}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}

          {groups.length === 0 && !loading && (
            <div className="col-span-full py-12 text-center text-slate-500">
              <Users size={36} className="mx-auto mb-2 opacity-50" />
              <p className="font-semibold">You haven't joined any van groups yet.</p>
              <p className="text-xs mt-1">Enter your 6-digit invite code above to get started.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default StudentGroups

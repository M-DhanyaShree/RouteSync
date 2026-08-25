import React, { useState } from 'react'
import { useAuthStore } from '../../store/authStore'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { MapPin, Clock, Calendar, Check, X } from 'lucide-react'

const StudentHome = () => {
  const { user } = useAuthStore()
  const [attendance, setAttendance] = useState(null) // null | 'PRESENT' | 'ABSENT'
  
  // Dummy data
  const tripStatus = 'PLANNED' // PLANNED, ACTIVE
  const activeEta = '8:15 AM'

  return (
    <div className="p-4 md:p-8 max-w-md mx-auto space-y-6">
      <div className="text-center pt-4">
        <h1 className="text-2xl font-bold">Hello, {user?.name.split(' ')[0]}</h1>
        <p className="text-slate-500">Here's your transport update for today.</p>
      </div>

      {/* Attendance Toggle Card */}
      <Card className="overflow-hidden border-brand-200 dark:border-brand-900">
        <div className="bg-brand-500/10 p-4 border-b border-brand-100 dark:border-brand-900">
          <div className="flex items-center gap-2 text-brand-600 dark:text-brand-400 font-medium">
            <Calendar size={18} />
            Today's Attendance
          </div>
        </div>
        <CardContent className="p-6">
          <p className="text-sm text-slate-500 mb-4 text-center">
            Are you taking the van today? (Locks when trip starts)
          </p>
          
          <div className="flex gap-4">
            <Button
              variant={attendance === 'PRESENT' ? 'default' : 'outline'}
              className="flex-1 gap-2 h-12"
              onClick={() => setAttendance('PRESENT')}
            >
              <Check size={18} /> Present
            </Button>
            <Button
              variant={attendance === 'ABSENT' ? 'destructive' : 'outline'}
              className="flex-1 gap-2 h-12"
              onClick={() => setAttendance('ABSENT')}
            >
              <X size={18} /> Absent
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Trip Status Card */}
      {attendance === 'PRESENT' && (
        <Card>
          <CardContent className="p-6">
            {tripStatus === 'PLANNED' ? (
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto text-slate-400">
                  <Clock size={32} />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Trip Not Started</h3>
                  <p className="text-slate-500 text-sm">Your driver hasn't started the morning route yet. We'll notify you when they do.</p>
                </div>
              </div>
            ) : (
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-brand-100 dark:bg-brand-900/30 rounded-full flex items-center justify-center mx-auto text-brand-500 animate-pulse-slow">
                  <MapPin size={32} />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Van is on the way!</h3>
                  <p className="text-slate-500 text-sm">Expected arrival at your stop:</p>
                  <p className="text-3xl font-bold text-brand-500 mt-2">{activeEta}</p>
                </div>
                <Button className="w-full mt-4">Track Live</Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default StudentHome

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { useAuthStore } from '../../store/authStore'
import { Users, Play, Clock, CheckCircle } from 'lucide-react'

const DriverDashboard = () => {
  const { user } = useAuthStore()

  // Dummy data for initial UI layout
  const stats = [
    { label: "Today's Groups", value: "2", icon: Users },
    { label: "Students Present", value: "14", icon: CheckCircle },
    { label: "Estimated Time", value: "45m", icon: Clock },
  ]

  const upcomingGroups = [
    { id: '1', name: 'Morning Route - Bengaluru', time: '07:30 AM', students: 12, ready: true },
    { id: '2', name: 'Evening Drop - Bengaluru', time: '03:45 PM', students: 15, ready: false },
  ]

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Good morning, {user?.name.split(' ')[0]}</h1>
          <p className="text-slate-500 dark:text-slate-400">Here's your schedule for today.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stats.map((stat, i) => {
          const Icon = stat.icon
          return (
            <Card key={i}>
              <CardContent className="p-6 flex items-center gap-4">
                <div className="p-3 rounded-xl bg-brand-50 dark:bg-brand-500/10 text-brand-500">
                  <Icon size={24} />
                </div>
                <div>
                  <p className="text-sm text-slate-500 font-medium">{stat.label}</p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <h2 className="text-xl font-semibold pt-4">Your Groups</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {upcomingGroups.map(group => (
          <Card key={group.id} className="hover:border-brand-500/50 transition-colors cursor-pointer group">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg group-hover:text-brand-500 transition-colors">{group.name}</CardTitle>
                <div className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-md text-xs font-medium">
                  {group.time}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-500 mb-4">{group.students} students in this route</p>
              
              {group.ready ? (
                <Button className="w-full gap-2">
                  <Play size={16} /> Start Trip
                </Button>
              ) : (
                <Button variant="secondary" className="w-full gap-2" disabled>
                  <Clock size={16} /> Too Early
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

export default DriverDashboard

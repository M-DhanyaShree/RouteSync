import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card'
import { Map, Activity, Users, Route } from 'lucide-react'

const AdminDashboard = () => {
  const stats = [
    { label: "Active Vans", value: "4", icon: Map },
    { label: "Total Students", value: "156", icon: Users },
    { label: "On-Time Rate", value: "94%", icon: Activity },
    { label: "Avg Route Efficiency", value: "+12%", icon: Route },
  ]

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Fleet Command Center</h1>
      
      {/* Bento Grid Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => {
          const Icon = stat.icon
          return (
            <Card key={i}>
              <CardContent className="p-6 flex items-center gap-4">
                <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-brand-500">
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 min-h-[400px]">
          <CardHeader>
            <CardTitle>Live Fleet Map</CardTitle>
          </CardHeader>
          <CardContent className="h-[350px] bg-slate-100 dark:bg-slate-800 rounded-xl mx-6 mb-6 flex items-center justify-center text-slate-400">
            Map Integration Pending
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Recent Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <div className="w-2 h-2 mt-2 rounded-full bg-amber-500" />
                <div>
                  <p className="text-sm font-medium">Route #4 Delayed</p>
                  <p className="text-xs text-slate-500">Traffic on Outer Ring Road</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-2 h-2 mt-2 rounded-full bg-emerald-500" />
                <div>
                  <p className="text-sm font-medium">Route #1 Completed</p>
                  <p className="text-xs text-slate-500">All 12 students dropped</p>
                </div>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default AdminDashboard

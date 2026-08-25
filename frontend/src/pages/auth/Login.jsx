import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import api from '../../api/axios'
import { Loader2 } from 'lucide-react'

const Login = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await api.post('/auth/login', { email, password })
      const { user, accessToken, refreshToken } = res.data.data
      
      setAuth(user, accessToken, refreshToken)

      // Redirect based on role
      if (user.role === 'DRIVER') navigate('/driver')
      else if (user.role === 'STUDENT') navigate('/student')
      else if (user.role === 'ADMIN') navigate('/admin')
      
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to login. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Pre-fill demo accounts for easy testing
  const setDemo = (role) => {
    if (role === 'driver') { setEmail('driver@routesync.app'); setPassword('Driver@123') }
    if (role === 'student') { setEmail('aarav@routesync.app'); setPassword('Student@123') }
    if (role === 'admin') { setEmail('admin@routesync.app'); setPassword('Admin@123') }
  }

  return (
    <div className="min-h-screen flex flex-col justify-center items-center p-4 bg-gradient-dark text-slate-50 relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-brand-500/20 rounded-full blur-[100px]" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-emerald-500/10 rounded-full blur-[100px]" />

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-10 animate-slide-down">
          <div className="w-16 h-16 mx-auto bg-gradient-brand rounded-2xl flex items-center justify-center text-white font-bold text-4xl shadow-glow mb-4">
            R
          </div>
          <h1 className="text-3xl font-display font-bold tracking-tight">RouteSync</h1>
          <p className="text-slate-400 mt-2">Smart Attendance & Van Tracking</p>
        </div>

        <div className="glass-effect rounded-3xl p-8 shadow-card-dark animate-slide-up">
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-sm text-center">
                {error}
              </div>
            )}
            
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-300 ml-1">Email</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
                placeholder="you@school.edu"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center ml-1">
                <label className="text-sm font-medium text-slate-300">Password</label>
                <a href="#" className="text-xs text-brand-400 hover:text-brand-300">Forgot?</a>
              </div>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
                placeholder="••••••••"
              />
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-gradient-brand hover:opacity-90 text-white font-semibold rounded-xl py-3 mt-2 shadow-glow transition-all flex items-center justify-center disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin mr-2" size={20} /> : 'Sign In'}
            </button>
          </form>

          {/* Demo Helpers */}
          <div className="mt-8 pt-6 border-t border-slate-800">
            <p className="text-xs text-slate-500 text-center mb-3">Quick Login (Demo)</p>
            <div className="grid grid-cols-3 gap-2">
              <button onClick={() => setDemo('driver')} type="button" className="text-xs py-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors text-slate-300">Driver</button>
              <button onClick={() => setDemo('student')} type="button" className="text-xs py-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors text-slate-300">Student</button>
              <button onClick={() => setDemo('admin')} type="button" className="text-xs py-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors text-slate-300">Admin</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login

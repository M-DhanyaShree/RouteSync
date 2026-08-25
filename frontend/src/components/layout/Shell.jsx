import React, { useState } from 'react'
import { Outlet, Link, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { LogOut, User as UserIcon, Menu, X, Map, Users, LayoutDashboard, Settings } from 'lucide-react'
import { cn } from '../../utils/cn'

const Shell = () => {
  const { user, logout } = useAuthStore()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const location = useLocation()

  // Define navigation based on role
  const getNavItems = () => {
    switch (user?.role) {
      case 'DRIVER':
        return [
          { name: 'Dashboard', href: '/driver', icon: LayoutDashboard },
          { name: 'Groups', href: '/driver/groups', icon: Users },
        ]
      case 'STUDENT':
        return [
          { name: 'Home', href: '/student', icon: Map },
          { name: 'My Groups', href: '/student/groups', icon: Users },
          { name: 'Settings', href: '/student/settings', icon: Settings },
        ]
      case 'ADMIN':
        return [
          { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
          { name: 'Fleet', href: '/admin/fleet', icon: Map },
        ]
      default:
        return []
    }
  }

  const navItems = getNavItems()

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 w-full glass-effect shadow-sm">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              className="md:hidden p-2 -ml-2 text-slate-600 dark:text-slate-300"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
            <Link to={`/${user?.role.toLowerCase()}`} className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center text-white font-bold text-xl">
                R
              </div>
              <span className="font-display font-bold text-xl tracking-tight hidden sm:block">
                RouteSync
              </span>
            </Link>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-6">
            {navItems.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  "text-sm font-medium transition-colors hover:text-brand-500",
                  location.pathname === item.href || location.pathname.startsWith(`${item.href}/`)
                    ? "text-brand-500"
                    : "text-slate-600 dark:text-slate-300"
                )}
              >
                {item.name}
              </Link>
            ))}
          </nav>

          {/* User Menu */}
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex flex-col items-end mr-2">
              <span className="text-sm font-semibold">{user?.name}</span>
              <span className="text-xs text-slate-500 dark:text-slate-400 capitalize">{user?.role.toLowerCase()}</span>
            </div>
            <button
              onClick={logout}
              className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-brand-500 dark:hover:text-brand-400 transition-colors"
              title="Logout"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-30 pt-16 bg-white/95 dark:bg-slate-950/95 backdrop-blur-sm animate-fade-in">
          <nav className="p-4 flex flex-col gap-2">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = location.pathname === item.href || location.pathname.startsWith(`${item.href}/`)
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors",
                    isActive
                      ? "bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400"
                      : "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                  )}
                >
                  <Icon size={20} />
                  {item.name}
                </Link>
              )
            })}
          </nav>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 w-full relative">
        <Outlet />
      </main>
    </div>
  )
}

export default Shell

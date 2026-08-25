import { Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import { useAuthStore } from './store/authStore'
import { initSocket, disconnectSocket } from './lib/socket'

// Layouts
import Shell from './components/layout/Shell'

// Auth Pages
import Login from './pages/auth/Login'
// import Register from './pages/auth/Register'

// Driver Pages
import DriverDashboard from './pages/driver/Dashboard'
import DriverGroups from './pages/driver/Groups'

// Student Pages
import StudentHome from './pages/student/Home'
import StudentGroups from './pages/student/Groups'
import StudentSettings from './pages/student/Settings'

// Admin Pages
import AdminDashboard from './pages/admin/Dashboard'
import AdminFleet from './pages/admin/Fleet'


// Protected Route Component
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, isAuthenticated, isCheckingAuth } = useAuthStore()

  if (isCheckingAuth) {
    return <div className="h-screen w-screen flex items-center justify-center">Loading...</div>
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect based on role if they try to access wrong route
    if (user.role === 'DRIVER') return <Navigate to="/driver" replace />
    if (user.role === 'STUDENT') return <Navigate to="/student" replace />
    if (user.role === 'ADMIN') return <Navigate to="/admin" replace />
  }

  return children
}

function App() {
  const { checkAuth, isAuthenticated, user } = useAuthStore()

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  // Initialize socket when authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      initSocket()
    } else {
      disconnectSocket()
    }
    return () => disconnectSocket()
  }, [isAuthenticated, user])

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<Login />} />
      {/* <Route path="/register" element={<Register />} /> */}

      {/* Driver Routes */}
      <Route path="/driver" element={
        <ProtectedRoute allowedRoles={['DRIVER']}>
          <Shell />
        </ProtectedRoute>
      }>
        <Route index element={<DriverDashboard />} />
        <Route path="groups" element={<DriverGroups />} />
      </Route>

      {/* Student Routes */}
      <Route path="/student" element={
        <ProtectedRoute allowedRoles={['STUDENT']}>
          <Shell />
        </ProtectedRoute>
      }>
        <Route index element={<StudentHome />} />
        <Route path="groups" element={<StudentGroups />} />
        <Route path="settings" element={<StudentSettings />} />
      </Route>

      {/* Admin Routes */}
      <Route path="/admin" element={
        <ProtectedRoute allowedRoles={['ADMIN']}>
          <Shell />
        </ProtectedRoute>
      }>
        <Route index element={<AdminDashboard />} />
        <Route path="fleet" element={<AdminFleet />} />
      </Route>


      {/* Fallback */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}

export default App

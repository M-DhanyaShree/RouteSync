import { io } from 'socket.io-client'
import { useAuthStore } from '../store/authStore'

let socket = null

export const initSocket = () => {
  if (socket) return socket

  const token = useAuthStore.getState().accessToken
  if (!token) return null

  // In Vite dev, the proxy handles routing /socket.io to the backend
  socket = io('/', {
    auth: { token },
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  })

  socket.on('connect', () => {
    console.log('[Socket] Connected:', socket.id)
  })

  socket.on('connect_error', (err) => {
    console.error('[Socket] Connection error:', err.message)
  })

  socket.on('disconnect', (reason) => {
    console.log('[Socket] Disconnected:', reason)
  })

  return socket
}

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}

export const getSocket = () => socket

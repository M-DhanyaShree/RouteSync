import { Server } from 'socket.io'
import { logger } from '../../config/logger'

let ioInstance: Server | null = null

export function initSocketService(io: Server) {
  ioInstance = io
  logger.info('⚡ Socket.IO service initialized')
}

export function getIO(): Server {
  if (!ioInstance) {
    throw new Error('Socket.IO instance has not been initialized')
  }
  return ioInstance
}

// Room name builders
export const groupRoom = (groupId: string) => `group:${groupId}`
export const tripRoom = (tripId: string) => `trip:${tripId}`

// Broadcast helpers
export function broadcastToGroup(groupId: string, event: string, data: any) {
  if (!ioInstance) return
  const room = groupRoom(groupId)
  ioInstance.to(room).emit(event, data)
  logger.debug(`Broadcast to group ${groupId}: ${event}`, { data })
}

export function broadcastToTrip(tripId: string, event: string, data: any) {
  if (!ioInstance) return
  const room = tripRoom(tripId)
  ioInstance.to(room).emit(event, data)
  logger.debug(`Broadcast to trip ${tripId}: ${event}`, { data })
}

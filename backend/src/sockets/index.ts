import { Server, Socket } from 'socket.io'
import { logger } from '../config/logger'
import { initSocketService, groupRoom, tripRoom } from '../shared/services/socket.service'
import { tripsService } from '../modules/trips/trips.service'
import jwt from 'jsonwebtoken'
import { env } from '../config/env'
import { JwtAccessPayload } from '../shared/types/api.types'

export function setupSockets(io: Server) {
  initSocketService(io)

  // Socket middleware for authentication
  io.use((socket, next) => {
    const token = socket.handshake.auth.token
    if (!token) {
      return next(new Error('Authentication error: Token missing'))
    }
    try {
      const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtAccessPayload
      socket.data.user = decoded
      next()
    } catch (err) {
      next(new Error('Authentication error: Invalid token'))
    }
  })

  io.on('connection', (socket: Socket) => {
    const user = socket.data.user as JwtAccessPayload
    logger.info(`User connected to socket: ${user.email} (${socket.id})`)

    // Join Group Room
    socket.on('join:group', (groupId: string) => {
      const room = groupRoom(groupId)
      socket.join(room)
      logger.debug(`Socket ${socket.id} joined ${room}`)
    })

    // Join Trip Room
    socket.on('join:trip', (tripId: string) => {
      const room = tripRoom(tripId)
      socket.join(room)
      logger.debug(`Socket ${socket.id} joined ${room}`)
    })

    // Leave Rooms
    socket.on('leave:group', (groupId: string) => socket.leave(groupRoom(groupId)))
    socket.on('leave:trip', (tripId: string) => socket.leave(tripRoom(tripId)))

    // Driver Location Update
    socket.on('location:send', async (data: { tripId: string, lat: number, lng: number }) => {
      if (user.role !== 'DRIVER') return

      try {
        await tripsService.handleLocationUpdate(data.tripId, user.userId, data.lat, data.lng)
      } catch (err) {
        logger.error('Failed to handle location update', { err: (err as Error).message })
      }
    })

    socket.on('disconnect', () => {
      logger.info(`User disconnected: ${user.email} (${socket.id})`)
    })
  })
}

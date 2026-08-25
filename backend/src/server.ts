import express from 'express'
import http from 'http'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import compression from 'compression'
import rateLimit from 'express-rate-limit'
import { Server as IOServer } from 'socket.io'

import { env } from './config/env'
import { logger } from './config/logger'
import { errorHandler, notFound } from './middleware/error.middleware'
import { setupSockets } from './sockets'

// Route Imports
import authRoutes from './modules/auth/auth.routes'
import groupRoutes from './modules/groups/groups.routes'
import attendanceRoutes from './modules/attendance/attendance.routes'
import tripRoutes from './modules/trips/trips.routes'

const app = express()
const server = http.createServer(app)
const io = new IOServer(server, {
  cors: { origin: env.CORS_ORIGIN, methods: ['GET', 'POST'] },
})

// Middleware
app.use(helmet())
app.use(cors({ origin: env.CORS_ORIGIN }))
app.use(compression())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Logging
const stream = { write: (message: string) => logger.http(message.trim()) }
app.use(morgan('combined', { stream }))

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 100, // Limit each IP to 100 requests per `window`
  standardHeaders: true,
  legacyHeaders: false,
})
app.use('/api', limiter)

// API Routes
app.get('/health', (req, res) => { res.json({ status: 'ok', timestamp: new Date() }) })
app.use('/api/auth', authRoutes)
app.use('/api/groups', groupRoutes)
app.use('/api/attendance', attendanceRoutes)
app.use('/api/trips', tripRoutes)

// Setup Socket.IO
setupSockets(io)

// Error Handling
app.use(notFound)
app.use(errorHandler)

server.listen(env.PORT, () => {
  logger.info(`🚀 Server running in ${env.NODE_ENV} mode on port ${env.PORT}`)
})

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully...')
  server.close(() => {
    logger.info('Process terminated')
    process.exit(0)
  })
})

import express from 'express'
import http from 'http'
import path from 'path'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import compression from 'compression'
import rateLimit from 'express-rate-limit'
import { Server as IOServer } from 'socket.io'
import { createServer as createViteServer } from 'vite'

import { env } from './config/env'
import { logger } from './config/logger'
import { errorHandler, notFound } from './middleware/error.middleware'
import { setupSockets } from './sockets'

// Route Imports
import authRoutes from './modules/auth/auth.routes'
import groupRoutes from './modules/groups/groups.routes'
import attendanceRoutes from './modules/attendance/attendance.routes'
import tripRoutes from './modules/trips/trips.routes'

async function startServer() {
  const app = express()
  const server = http.createServer(app)
  const io = new IOServer(server, {
    cors: { origin: env.CORS_ORIGIN, methods: ['GET', 'POST'] },
  })

  // Security Middleware - allow CartoDB/OSM tiles and cdn fonts
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    })
  )
  app.use(cors({ origin: env.CORS_ORIGIN }))
  app.use(compression())
  app.use(express.json())
  app.use(express.urlencoded({ extended: true }))

  // Logging
  const stream = { write: (message: string) => logger.http(message.trim()) }
  app.use(morgan('dev', { stream }))

  // Rate limiting for API routes only
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 300,
    standardHeaders: true,
    legacyHeaders: false,
  })
  app.use('/api', limiter)

  // API Routes
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date() })
  })
  app.use('/api/auth', authRoutes)
  app.use('/api/groups', groupRoutes)
  app.use('/api/attendance', attendanceRoutes)
  app.use('/api/trips', tripRoutes)

  // Setup Socket.IO
  setupSockets(io)

  // Frontend Serving (Vite middleware in dev, Static build in prod)
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      root: path.resolve(process.cwd(), 'frontend'),
      server: {
        middlewareMode: true,
      },
      appType: 'spa',
    })
    app.use(vite.middlewares)
  } else {
    const distPath = path.resolve(process.cwd(), 'frontend/dist')
    app.use(express.static(distPath))
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'))
    })
  }

  // Error Handling (for API requests that don't match or throw)
  app.use('/api/*', notFound)
  app.use(errorHandler)

  const port = env.PORT || 3000
  server.listen(port, '0.0.0.0', () => {
    logger.info(`🚀 RouteSync server running in ${env.NODE_ENV} mode on http://0.0.0.0:${port}`)
  })

  // Graceful shutdown
  process.on('SIGTERM', () => {
    logger.info('SIGTERM received. Shutting down gracefully...')
    server.close(() => {
      logger.info('Process terminated')
      process.exit(0)
    })
  })
}

startServer().catch(err => {
  console.error('Failed to start server:', err)
  process.exit(1)
})

import { PrismaClient } from '@prisma/client'
import { logger } from './logger'

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined
}

// Prevent multiple Prisma instances in dev (hot reload)
export const prisma =
  global.__prisma ??
  new PrismaClient({
    log: [
      { emit: 'event', level: 'query' },
      { emit: 'event', level: 'error' },
    ],
  })

if (process.env.NODE_ENV === 'development') {
  global.__prisma = prisma
}

prisma.$on('error', e => {
  logger.error('Prisma error', { message: e.message, target: e.target })
})

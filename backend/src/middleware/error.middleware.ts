import { Request, Response, NextFunction } from 'express'
import { logger } from '../config/logger'
import { fail } from '../shared/types/api.types'

export class AppError extends Error {
  public readonly statusCode: number
  public readonly isOperational: boolean

  constructor(message: string, statusCode = 500, isOperational = true) {
    super(message)
    this.statusCode = statusCode
    this.isOperational = isOperational
    Object.setPrototypeOf(this, AppError.prototype)
    Error.captureStackTrace(this, this.constructor)
  }
}

// Global error handler — must have 4 arguments for Express to recognize it
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof AppError) {
    if (!err.isOperational) {
      logger.error('Unexpected AppError', { err, url: req.url, method: req.method })
    }
    res.status(err.statusCode).json(fail(err.message))
    return
  }

  // Prisma errors
  if (err.constructor.name === 'PrismaClientKnownRequestError') {
    const prismaErr = err as any
    if (prismaErr.code === 'P2002') {
      res.status(409).json(fail('A record with that value already exists'))
      return
    }
    if (prismaErr.code === 'P2025') {
      res.status(404).json(fail('Record not found'))
      return
    }
  }

  logger.error('Unhandled error', { err: err.message, stack: err.stack, url: req.url })
  res.status(500).json(fail('An unexpected error occurred'))
}

export function notFound(req: Request, res: Response): void {
  res.status(404).json(fail(`Route ${req.method} ${req.path} not found`))
}
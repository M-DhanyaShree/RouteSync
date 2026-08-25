import winston from 'winston'
import { env } from './env'

const { combine, timestamp, colorize, printf, json, errors } = winston.format

const devFormat = combine(
  errors({ stack: true }),
  colorize({ all: true }),
  timestamp({ format: 'HH:mm:ss' }),
  printf(({ level, message, timestamp, stack, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : ''
    return `${timestamp} [${level}]: ${stack || message}${metaStr}`
  })
)

const prodFormat = combine(
  errors({ stack: true }),
  timestamp(),
  json()
)

export const logger = winston.createLogger({
  level: env.LOG_LEVEL,
  format: env.NODE_ENV === 'production' ? prodFormat : devFormat,
  transports: [
    new winston.transports.Console(),
    ...(env.NODE_ENV === 'production'
      ? [
          new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
          new winston.transports.File({ filename: 'logs/combined.log' }),
        ]
      : []),
  ],
})
import { Request, Response, NextFunction } from 'express'
import { ZodSchema, ZodError } from 'zod'
import { AppError } from './error.middleware'

export function validate(schema: ZodSchema, source: 'body' | 'query' | 'params' = 'body') {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const dataToValidate = req[source]
      const result = schema.safeParse(dataToValidate)
      if (!result.success) {
        const errorMessages = result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ')
        return next(new AppError(`Validation failed: ${errorMessages}`, 400))
      }
      req[source] = result.data
      next()
    } catch (err) {
      next(err)
    }
  }
}

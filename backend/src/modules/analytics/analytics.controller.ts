import { Request, Response, NextFunction } from 'express'
import { analyticsService } from './analytics.service'
import { ok } from '../../shared/types/api.types'

export class AnalyticsController {
  async getAdminMetrics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await analyticsService.getAdminDashboardMetrics()
      res.json(ok('Admin analytics fetched', data))
    } catch (err) { next(err) }
  }

  async getDriverMetrics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await analyticsService.getDriverDashboardMetrics(req.user!.userId)
      res.json(ok('Driver analytics fetched', data))
    } catch (err) { next(err) }
  }
}

export const analyticsController = new AnalyticsController()

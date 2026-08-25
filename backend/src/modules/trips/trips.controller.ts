import { Request, Response, NextFunction } from 'express'
import { tripsService } from './trips.service'
import { ok } from '../../shared/types/api.types'
import { startTripSchema } from './trips.dto'

export class TripsController {
  async start(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const trip = await tripsService.startTrip(req.user!.userId, req.body)
      res.status(201).json(ok('Trip started successfully', trip))
    } catch (err) { next(err) }
  }

  async getActiveByGroup(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const trip = await tripsService.getActiveTripByGroup(req.params.groupId)
      if (!trip) {
        res.json(ok('No active trip for this group', null))
        return
      }
      res.json(ok('Active trip fetched', trip))
    } catch (err) { next(err) }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const trip = await tripsService.getTrip(req.params.id)
      res.json(ok('Trip fetched', trip))
    } catch (err) { next(err) }
  }
}

export const tripsController = new TripsController()

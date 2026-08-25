import { Request, Response, NextFunction } from 'express'
import { tripsService } from './trips.service'
import { ok } from '../../shared/types/api.types'

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

  async updateStopStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { tripId, stopId } = req.params
      const { status, actualLat, actualLng } = req.body
      const result = await tripsService.updateStopStatus(tripId, stopId, req.user!.userId, status, actualLat, actualLng)
      res.json(ok(`Stop marked as ${status}`, result))
    } catch (err) { next(err) }
  }

  async endTrip(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await tripsService.endTrip(req.params.id, req.user!.userId)
      res.json(ok('Trip completed successfully', result))
    } catch (err) { next(err) }
  }

  async cancelTrip(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await tripsService.cancelTrip(req.params.id, req.user!.userId, req.body.reason)
      res.json(ok('Trip cancelled', result))
    } catch (err) { next(err) }
  }

  async emergency(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { lat, lng, reason } = req.body
      const result = await tripsService.triggerEmergency(req.params.id, req.user!.userId, lat, lng, reason)
      res.json(ok('Emergency alert broadcasted', result))
    } catch (err) { next(err) }
  }

  async getHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = req.query.page ? Number(req.query.page) : 1
      const limit = req.query.limit ? Number(req.query.limit) : 20
      const result = await tripsService.getTripsHistory(req.user!.userId, req.user!.role, page, limit)
      res.json(ok('Trip history fetched', result))
    } catch (err) { next(err) }
  }

  async getInspector(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await tripsService.getTripRouteComparison(req.params.id)
      res.json(ok('Route inspection fetched', result))
    } catch (err) { next(err) }
  }
}

export const tripsController = new TripsController()


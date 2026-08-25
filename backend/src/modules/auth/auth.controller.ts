import { Request, Response, NextFunction } from 'express'
import { authService } from './auth.service'
import { ok } from '../../shared/types/api.types'

export class AuthController {
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.register(req.body)
      res.status(201).json(ok('Registration successful', result))
    } catch (err) { next(err) }
  }

  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.login(req.body)
      res.json(ok('Login successful', result))
    } catch (err) { next(err) }
  }

  async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.refresh(req.body.refreshToken)
      res.json(ok('Token refreshed', result))
    } catch (err) { next(err) }
  }

  async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await authService.logout(req.user!.userId)
      res.json(ok('Logged out successfully'))
    } catch (err) { next(err) }
  }

  async me(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await authService.getMe(req.user!.userId)
      res.json(ok('Profile fetched', user))
    } catch (err) { next(err) }
  }

  async updateLocation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const location = await authService.updateLocation(req.user!.userId, req.body)
      res.json(ok('Pickup location updated successfully', location))
    } catch (err) { next(err) }
  }

  async getLocation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const location = await authService.getLocation(req.user!.userId)
      res.json(ok('Pickup location fetched', location))
    } catch (err) { next(err) }
  }
}


export const authController = new AuthController()

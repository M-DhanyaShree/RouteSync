import { Request, Response, NextFunction } from 'express'
import { groupsService } from './groups.service'
import { ok } from '../../shared/types/api.types'

export class GroupsController {
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const group = await groupsService.createGroup(req.user!.userId, req.body)
      res.status(201).json(ok('Group created', group))
    } catch (err) { next(err) }
  }

  async getOne(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const group = await groupsService.getGroup(req.params.id, req.user!.userId, req.user!.role)
      res.json(ok('Group fetched', group))
    } catch (err) { next(err) }
  }

  async getMy(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const groups = req.user!.role === 'DRIVER'
        ? await groupsService.getDriverGroups(req.user!.userId)
        : await groupsService.getStudentGroups(req.user!.userId)
      res.json(ok('Groups fetched', groups))
    } catch (err) { next(err) }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const group = await groupsService.updateGroup(req.params.id, req.user!.userId, req.body)
      res.json(ok('Group updated', group))
    } catch (err) { next(err) }
  }

  async remove(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await groupsService.deleteGroup(req.params.id, req.user!.userId)
      res.json(ok('Group deleted'))
    } catch (err) { next(err) }
  }

  async refreshInviteCode(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await groupsService.refreshInviteCode(req.params.id, req.user!.userId)
      res.json(ok('Invite code refreshed', result))
    } catch (err) { next(err) }
  }

  async join(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const group = await groupsService.joinGroup(req.user!.userId, req.body)
      res.json(ok('Joined group successfully', group))
    } catch (err) { next(err) }
  }

  async leave(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await groupsService.leaveGroup(req.params.id, req.user!.userId)
      res.json(ok('Left group successfully'))
    } catch (err) { next(err) }
  }

  async addDestination(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const dest = await groupsService.addDestination(req.params.id, req.user!.userId, req.body)
      res.status(201).json(ok('Destination added', dest))
    } catch (err) { next(err) }
  }

  async removeDestination(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await groupsService.removeDestination(req.params.id, req.params.destId, req.user!.userId)
      res.json(ok('Destination removed'))
    } catch (err) { next(err) }
  }
}

export const groupsController = new GroupsController()

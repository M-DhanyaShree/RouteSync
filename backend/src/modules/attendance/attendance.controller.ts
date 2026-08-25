import { Request, Response, NextFunction } from 'express'
import { attendanceService } from './attendance.service'
import { ok } from '../../shared/types/api.types'
import { markAttendanceSchema, attendanceHistorySchema } from './attendance.dto'

export class AttendanceController {
  async mark(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await attendanceService.markAttendance(req.user!.userId, req.body)
      res.json(ok('Attendance marked', result))
    } catch (err) { next(err) }
  }

  async getTodayGroup(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await attendanceService.getTodayForGroup(req.params.groupId)
      res.json(ok('Today attendance fetched', result))
    } catch (err) { next(err) }
  }

  async getStudentHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // The body is populated by validate middleware via query parameters due to how we'll configure it
      const { page, limit } = req.query as any 
      const result = await attendanceService.getStudentHistory(req.user!.userId, Number(page), Number(limit))
      res.json(ok('Student attendance history', result.records, { 
        total: result.stats.total, 
        page: Number(page), 
        limit: Number(limit), 
        totalPages: Math.ceil(result.stats.total / Number(limit)) 
      }))
    } catch (err) { next(err) }
  }

  async getGroupHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { page, limit } = req.query as any
      const result = await attendanceService.getGroupHistory(req.params.groupId, Number(page), Number(limit))
      res.json(ok('Group attendance history', result))
    } catch (err) { next(err) }
  }
}

export const attendanceController = new AttendanceController()

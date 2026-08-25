import { Router } from 'express'
import { attendanceController } from './attendance.controller'
import { authenticate, authorize } from '../../middleware/auth.middleware'
import { validate } from '../../middleware/validate.middleware'
import { markAttendanceSchema, attendanceHistorySchema } from './attendance.dto'

const router = Router()

router.use(authenticate)

// Student marks attendance
router.post('/mark', authorize('STUDENT'), validate(markAttendanceSchema), attendanceController.mark.bind(attendanceController))

// Driver views today's attendance for a group
router.get('/group/:groupId/today', authorize('DRIVER', 'ADMIN'), attendanceController.getTodayGroup.bind(attendanceController))

// Student history
router.get('/student/history', authorize('STUDENT'), validate(attendanceHistorySchema, 'query'), attendanceController.getStudentHistory.bind(attendanceController))

// Group history
router.get('/group/:groupId/history', authorize('DRIVER', 'ADMIN'), validate(attendanceHistorySchema, 'query'), attendanceController.getGroupHistory.bind(attendanceController))

export default router

import { z } from 'zod'

export const markAttendanceSchema = z.object({
  groupId: z.string().min(1, 'Group ID is required'),
  status: z.enum(['PRESENT', 'ABSENT']),
  date: z.string().optional(), // ISO date string, defaults to today
})

export const attendanceHistorySchema = z.object({
  groupId: z.string().min(1).optional(),
  studentId: z.string().min(1).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(30),
})

export type MarkAttendanceDto = z.infer<typeof markAttendanceSchema>

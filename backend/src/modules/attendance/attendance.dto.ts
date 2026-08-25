import { z } from 'zod'

export const markAttendanceSchema = z.object({
  groupId: z.string().cuid(),
  status: z.enum(['PRESENT', 'ABSENT']),
  date: z.string().optional(), // ISO date string, defaults to today
})

export const attendanceHistorySchema = z.object({
  groupId: z.string().cuid().optional(),
  studentId: z.string().cuid().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(30),
})

export type MarkAttendanceDto = z.infer<typeof markAttendanceSchema>

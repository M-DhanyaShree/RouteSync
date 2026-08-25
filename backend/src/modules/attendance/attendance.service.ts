import { attendanceRepository } from './attendance.repository'
import { groupsRepository } from '../groups/groups.repository'
import { AppError } from '../../middleware/error.middleware'
import { MarkAttendanceDto } from './attendance.dto'
import { broadcastToGroup } from '../../shared/services/socket.service'

export class AttendanceService {
  async markAttendance(studentId: string, dto: MarkAttendanceDto) {
    // Verify student is a member
    const isMember = await groupsRepository.isMember(dto.groupId, studentId)
    if (!isMember) throw new AppError('You are not a member of this group', 403)

    const date = dto.date ? new Date(dto.date) : new Date()
    date.setHours(0, 0, 0, 0)

    // Check if locked
    const locked = await attendanceRepository.isLocked(dto.groupId, date)
    if (locked) throw new AppError('Attendance is locked for today — the trip has started', 400)

    const record = await attendanceRepository.upsert({
      groupId: dto.groupId,
      studentId,
      date,
      status: dto.status,
    })

    // Broadcast change to the group room
    broadcastToGroup(dto.groupId, 'attendance:changed', {
      studentId,
      status: dto.status,
      date: date.toISOString(),
    })

    return record
  }

  async getTodayForGroup(groupId: string) {
    return attendanceRepository.findTodayForGroup(groupId)
  }

  async getStudentHistory(studentId: string, page: number, limit: number) {
    const offset = (page - 1) * limit
    const [records, stats] = await Promise.all([
      attendanceRepository.findStudentHistory(studentId, limit, offset),
      attendanceRepository.countForStudent(studentId),
    ])
    return { records, stats }
  }

  async getGroupHistory(groupId: string, page: number, limit: number) {
    const offset = (page - 1) * limit
    return attendanceRepository.findGroupHistory(groupId, limit, offset)
  }
}

export const attendanceService = new AttendanceService()

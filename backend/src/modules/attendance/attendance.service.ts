import { attendanceRepository } from './attendance.repository'
import { groupsRepository } from '../groups/groups.repository'
import { AppError } from '../../middleware/error.middleware'
import { MarkAttendanceDto } from './attendance.dto'
import { broadcastToGroup } from '../../shared/services/socket.service'
import { tripsService } from '../trips/trips.service'
import { tripsRepository } from '../trips/trips.repository'

export class AttendanceService {
  async markAttendance(studentId: string, dto: MarkAttendanceDto) {
    // Verify student is a member
    const isMember = await groupsRepository.isMember(dto.groupId, studentId)
    if (!isMember) throw new AppError('You are not a member of this group', 403)

    const date = dto.date ? new Date(dto.date) : new Date()
    date.setHours(0, 0, 0, 0)

    // Save/Update attendance record
    const record = await attendanceRepository.upsert({
      groupId: dto.groupId,
      studentId,
      date,
      status: dto.status,
    })

    // If student informs ABSENT (even late or during active trip), dynamically re-optimize route!
    if (dto.status === 'ABSENT') {
      try {
        await tripsService.handleLateAbsence(dto.groupId, studentId)
      } catch (err) {
        console.error('Error handling late absence dynamic route re-optimization:', err)
      }
    }

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

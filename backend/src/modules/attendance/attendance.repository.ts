import { prisma } from '../../config/database'
import { MarkAttendanceDto } from './attendance.dto'

export class AttendanceRepository {
  async upsert(dto: {
    groupId: string
    studentId: string
    date: Date
    status: 'PRESENT' | 'ABSENT'
    tripId?: string
  }) {
    return prisma.attendance.upsert({
      where: {
        groupId_studentId_date: {
          groupId: dto.groupId,
          studentId: dto.studentId,
          date: dto.date,
        },
      },
      create: {
        groupId: dto.groupId,
        studentId: dto.studentId,
        date: dto.date,
        status: dto.status,
        tripId: dto.tripId,
      },
      update: {
        status: dto.status,
        markedAt: new Date(),
      },
      include: {
        student: { select: { id: true, name: true, avatarUrl: true } },
      },
    })
  }

  async findTodayForGroup(groupId: string) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return prisma.attendance.findMany({
      where: { groupId, date: today },
      include: {
        student: { select: { id: true, name: true, avatarUrl: true, phone: true } },
      },
      orderBy: { student: { name: 'asc' } },
    })
  }

  async findByGroupAndDate(groupId: string, date: Date) {
    return prisma.attendance.findMany({
      where: { groupId, date },
      include: {
        student: { select: { id: true, name: true, avatarUrl: true } },
      },
    })
  }

  async lockForGroup(groupId: string, date: Date, tripId: string) {
    const start = new Date(date)
    start.setHours(0, 0, 0, 0)
    await prisma.attendance.updateMany({
      where: { groupId, date: start },
      data: { isLocked: true, tripId },
    })
  }

  async findStudentHistory(studentId: string, limit = 30, offset = 0) {
    return prisma.attendance.findMany({
      where: { studentId },
      orderBy: { date: 'desc' },
      take: limit,
      skip: offset,
      include: {
        group: { select: { id: true, name: true } },
      },
    })
  }

  async findGroupHistory(groupId: string, limit = 30, offset = 0) {
    return prisma.attendance.findMany({
      where: { groupId },
      orderBy: { date: 'desc' },
      take: limit,
      skip: offset,
      include: {
        student: { select: { id: true, name: true } },
      },
    })
  }

  async countForStudent(studentId: string) {
    const [total, present] = await Promise.all([
      prisma.attendance.count({ where: { studentId } }),
      prisma.attendance.count({ where: { studentId, status: 'PRESENT' } }),
    ])
    return { total, present, absent: total - present }
  }

  async isLocked(groupId: string, date: Date): Promise<boolean> {
    const record = await prisma.attendance.findFirst({
      where: { groupId, date, isLocked: true },
    })
    return !!record
  }
}

export const attendanceRepository = new AttendanceRepository()

import { prisma } from '../../config/database'
import { CreateGroupDto, UpdateGroupDto, CreateDestinationDto } from './groups.dto'
import { nanoid } from 'nanoid'

function generateInviteCode(): string {
  return `RS-${nanoid(6).toUpperCase()}`
}

export class GroupsRepository {
  async create(driverId: string, dto: CreateGroupDto) {
    return prisma.group.create({
      data: {
        name: dto.name,
        description: dto.description,
        driverId,
        inviteCode: generateInviteCode(),
        maxCapacity: dto.maxCapacity,
        destinations: {
          create: dto.destinations?.map((d: any) => ({
            name: d.name,
            lat: d.lat,
            lng: d.lng,
            address: d.address,
            order: d.order || 0
          })) || []
        }
      },
      include: { destinations: true, _count: { select: { members: true } } },
    })
  }

  async findById(id: string) {
    return prisma.group.findUnique({
      where: { id },
      include: {
        driver: { select: { id: true, name: true, phone: true, avatarUrl: true } },
        destinations: { orderBy: { order: 'asc' } },
        members: {
          where: { isActive: true },
          include: {
            student: {
              select: {
                id: true, name: true, email: true, phone: true, avatarUrl: true,
                locations: { where: { isDefault: true }, take: 1 },
              },
            },
          },
        },
        _count: { select: { members: { where: { isActive: true } } } },
      },
    })
  }

  async findByDriver(driverId: string) {
    return prisma.group.findMany({
      where: { driverId, isActive: true },
      include: {
        destinations: { orderBy: { order: 'asc' }, take: 1 },
        _count: { select: { members: { where: { isActive: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  async findByStudent(studentId: string) {
    return prisma.group.findMany({
      where: {
        isActive: true,
        members: { some: { studentId, isActive: true } },
      },
      include: {
        driver: { select: { id: true, name: true, phone: true, avatarUrl: true } },
        destinations: { orderBy: { order: 'asc' }, take: 1 },
        _count: { select: { members: { where: { isActive: true } } } },
      },
    })
  }

  async findByInviteCode(inviteCode: string) {
    return prisma.group.findUnique({
      where: { inviteCode: inviteCode.toUpperCase() },
      include: {
        driver: { select: { id: true, name: true } },
        _count: { select: { members: { where: { isActive: true } } } },
      },
    })
  }

  async update(id: string, dto: UpdateGroupDto) {
    return prisma.group.update({
      where: { id },
      data: dto,
    })
  }

  async delete(id: string) {
    return prisma.group.update({ where: { id }, data: { isActive: false } })
  }

  async refreshInviteCode(id: string) {
    return prisma.group.update({
      where: { id },
      data: { inviteCode: generateInviteCode() },
      select: { inviteCode: true },
    })
  }

  async addMember(groupId: string, studentId: string) {
    return prisma.groupMember.upsert({
      where: { groupId_studentId: { groupId, studentId } },
      create: { groupId, studentId, isActive: true },
      update: { isActive: true },
    })
  }

  async removeMember(groupId: string, studentId: string) {
    return prisma.groupMember.update({
      where: { groupId_studentId: { groupId, studentId } },
      data: { isActive: false },
    })
  }

  async isMember(groupId: string, studentId: string): Promise<boolean> {
    const m = await prisma.groupMember.findFirst({
      where: { groupId, studentId, isActive: true },
    })
    return !!m
  }

  async addDestination(groupId: string, dto: CreateDestinationDto) {
    return prisma.destination.create({ data: { groupId, ...dto } })
  }

  async deleteDestination(id: string) {
    return prisma.destination.delete({ where: { id } })
  }
}

export const groupsRepository = new GroupsRepository()

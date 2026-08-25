import { groupsRepository } from './groups.repository'
import { CreateGroupDto, UpdateGroupDto, JoinGroupDto, CreateDestinationDto } from './groups.dto'
import { AppError } from '../../middleware/error.middleware'

export class GroupsService {
  async createGroup(driverId: string, dto: CreateGroupDto) {
    return groupsRepository.create(driverId, dto)
  }

  async getGroup(groupId: string, requesterId: string, requesterRole: string) {
    const group = await groupsRepository.findById(groupId)
    if (!group) throw new AppError('Group not found', 404)

    // Only driver or active member can view
    if (requesterRole === 'DRIVER' && group.driverId !== requesterId) {
      throw new AppError('Access denied', 403)
    }
    if (requesterRole === 'STUDENT') {
      const isMember = await groupsRepository.isMember(groupId, requesterId)
      if (!isMember) throw new AppError('You are not a member of this group', 403)
    }

    return group
  }

  async getDriverGroups(driverId: string) {
    return groupsRepository.findByDriver(driverId)
  }

  async getStudentGroups(studentId: string) {
    return groupsRepository.findByStudent(studentId)
  }

  async updateGroup(groupId: string, driverId: string, dto: UpdateGroupDto) {
    const group = await groupsRepository.findById(groupId)
    if (!group) throw new AppError('Group not found', 404)
    if (group.driverId !== driverId) throw new AppError('Only the group driver can update this group', 403)
    return groupsRepository.update(groupId, dto)
  }

  async deleteGroup(groupId: string, driverId: string) {
    const group = await groupsRepository.findById(groupId)
    if (!group) throw new AppError('Group not found', 404)
    if (group.driverId !== driverId) throw new AppError('Only the group driver can delete this group', 403)
    return groupsRepository.delete(groupId)
  }

  async refreshInviteCode(groupId: string, driverId: string) {
    const group = await groupsRepository.findById(groupId)
    if (!group) throw new AppError('Group not found', 404)
    if (group.driverId !== driverId) throw new AppError('Only the driver can regenerate invite codes', 403)
    return groupsRepository.refreshInviteCode(groupId)
  }

  async joinGroup(studentId: string, dto: JoinGroupDto) {
    const group = await groupsRepository.findByInviteCode(dto.inviteCode)
    if (!group) throw new AppError('Invalid invite code', 404)
    if (!group.isActive) throw new AppError('This group is no longer active', 400)

    const currentCount = group._count.members
    if (currentCount >= group.maxCapacity) {
      throw new AppError('This group is at full capacity', 400)
    }

    const alreadyMember = await groupsRepository.isMember(group.id, studentId)
    if (alreadyMember) throw new AppError('You are already a member of this group', 409)

    await groupsRepository.addMember(group.id, studentId)
    return groupsRepository.findById(group.id)
  }

  async leaveGroup(groupId: string, studentId: string) {
    const isMember = await groupsRepository.isMember(groupId, studentId)
    if (!isMember) throw new AppError('You are not a member of this group', 404)
    await groupsRepository.removeMember(groupId, studentId)
  }

  async addDestination(groupId: string, driverId: string, dto: CreateDestinationDto) {
    const group = await groupsRepository.findById(groupId)
    if (!group) throw new AppError('Group not found', 404)
    if (group.driverId !== driverId) throw new AppError('Only the driver can manage destinations', 403)
    return groupsRepository.addDestination(groupId, dto)
  }

  async removeDestination(groupId: string, destinationId: string, driverId: string) {
    const group = await groupsRepository.findById(groupId)
    if (!group) throw new AppError('Group not found', 404)
    if (group.driverId !== driverId) throw new AppError('Only the driver can manage destinations', 403)
    return groupsRepository.deleteDestination(destinationId)
  }
}

export const groupsService = new GroupsService()

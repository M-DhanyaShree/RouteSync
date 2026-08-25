import { z } from 'zod'

export const createGroupSchema = z.object({
  name: z.string().min(3, 'Group name must be at least 3 characters').max(100),
  description: z.string().max(300).optional(),
  maxCapacity: z.number().int().min(1).max(60).default(20),
})

export const updateGroupSchema = z.object({
  name: z.string().min(3).max(100).optional(),
  description: z.string().max(300).optional(),
  maxCapacity: z.number().int().min(1).max(60).optional(),
  isActive: z.boolean().optional(),
})

export const joinGroupSchema = z.object({
  inviteCode: z.string().min(1, 'Invite code is required'),
})

export const createDestinationSchema = z.object({
  name: z.string().min(2).max(100),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  address: z.string().min(5),
  order: z.number().int().min(0).default(0),
})

export type CreateGroupDto = z.infer<typeof createGroupSchema>
export type UpdateGroupDto = z.infer<typeof updateGroupSchema>
export type JoinGroupDto = z.infer<typeof joinGroupSchema>
export type CreateDestinationDto = z.infer<typeof createDestinationSchema>

import { z } from 'zod'

export const startTripSchema = z.object({
  groupId: z.string().min(1, 'Group ID is required'),
  destinationId: z.string().min(1).optional(),
  startLat: z.number().min(-90).max(90),
  startLng: z.number().min(-180).max(180),
})

export const updateStopStatusSchema = z.object({
  status: z.enum(['ARRIVED', 'PICKED_UP', 'SKIPPED']),
  actualLat: z.number().optional(),
  actualLng: z.number().optional(),
})

export const emergencySchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  reason: z.string().default('Driver triggered Emergency Alert'),
})

export const cancelTripSchema = z.object({
  reason: z.string().optional().default('Trip cancelled by driver'),
})

export type StartTripDto = z.infer<typeof startTripSchema>
export type UpdateStopStatusDto = z.infer<typeof updateStopStatusSchema>
export type EmergencyDto = z.infer<typeof emergencySchema>
export type CancelTripDto = z.infer<typeof cancelTripSchema>


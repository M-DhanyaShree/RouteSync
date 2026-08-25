import { z } from 'zod'

export const startTripSchema = z.object({
  groupId: z.string().cuid(),
  destinationId: z.string().cuid().optional(),
  startLat: z.number().min(-90).max(90),
  startLng: z.number().min(-180).max(180),
})

export const updateStopSchema = z.object({
  action: z.enum(['arrive', 'skip']),
  actualLat: z.number().optional(),
  actualLng: z.number().optional(),
})

export type StartTripDto = z.infer<typeof startTripSchema>

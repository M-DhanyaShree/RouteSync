import { logger } from '../../config/logger'
import { prisma } from '../../config/database'

export interface NotificationPayload {
  userId: string
  title: string
  body: string
  type: string
  metadata?: any
}

export const Notifications = {
  tripStarted: (studentId: string, groupName: string, tripId: string): NotificationPayload => ({
    userId: studentId,
    title: 'Trip Started',
    body: `The van for ${groupName} is on its way! Track live to see updated ETAs.`,
    type: 'TRIP_STARTED',
    metadata: { tripId, groupName },
  }),

  stopApproaching: (studentId: string, minutes: number, tripId: string): NotificationPayload => ({
    userId: studentId,
    title: 'Van Approaching',
    body: `The van will arrive at your pickup location in ~${minutes} minutes. Please be ready.`,
    type: 'STOP_APPROACHING',
    metadata: { tripId, minutes },
  }),

  tripCompleted: (studentId: string, tripId: string): NotificationPayload => ({
    userId: studentId,
    title: 'Trip Completed',
    body: 'The route has reached its destination safely.',
    type: 'TRIP_COMPLETED',
    metadata: { tripId },
  }),
}

export class NotificationService {
  async send(payload: NotificationPayload) {
    try {
      logger.info(`[Notification] To ${payload.userId}: [${payload.title}] ${payload.body}`)
      await prisma.notification.create({
        data: {
          userId: payload.userId,
          title: payload.title,
          body: payload.body,
          type: payload.type,
          metadata: payload.metadata,
        },
      })
    } catch (err) {
      logger.warn('[Notification] Failed to record notification', { error: (err as Error).message })
    }
  }
}

export const notificationService = new NotificationService()

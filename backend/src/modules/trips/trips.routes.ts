import { Router } from 'express'
import { tripsController } from './trips.controller'
import { authenticate, authorize } from '../../middleware/auth.middleware'
import { validate } from '../../middleware/validate.middleware'
import { startTripSchema, updateStopStatusSchema, emergencySchema, cancelTripSchema } from './trips.dto'

const router = Router()

router.use(authenticate)

router.post('/', authorize('DRIVER'), validate(startTripSchema), tripsController.start.bind(tripsController))
router.get('/history', tripsController.getHistory.bind(tripsController))
router.get('/active/:groupId', tripsController.getActiveByGroup.bind(tripsController))
router.get('/:id', tripsController.getById.bind(tripsController))
router.get('/:id/inspector', tripsController.getInspector.bind(tripsController))

// Stop updates and actions
router.put('/:tripId/stops/:stopId/status', authorize('DRIVER'), validate(updateStopStatusSchema), tripsController.updateStopStatus.bind(tripsController))
router.post('/:id/end', authorize('DRIVER'), tripsController.endTrip.bind(tripsController))
router.post('/:id/cancel', authorize('DRIVER'), validate(cancelTripSchema), tripsController.cancelTrip.bind(tripsController))
router.post('/:id/emergency', authorize('DRIVER'), validate(emergencySchema), tripsController.emergency.bind(tripsController))

export default router


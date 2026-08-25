import { Router } from 'express'
import { tripsController } from './trips.controller'
import { authenticate, authorize } from '../../middleware/auth.middleware'
import { validate } from '../../middleware/validate.middleware'
import { startTripSchema } from './trips.dto'

const router = Router()

router.use(authenticate)

router.post('/', authorize('DRIVER'), validate(startTripSchema), tripsController.start.bind(tripsController))
router.get('/active/:groupId', tripsController.getActiveByGroup.bind(tripsController))
router.get('/:id', tripsController.getById.bind(tripsController))

export default router

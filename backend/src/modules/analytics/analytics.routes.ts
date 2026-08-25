import { Router } from 'express'
import { analyticsController } from './analytics.controller'
import { authenticate, authorize } from '../../middleware/auth.middleware'

const router = Router()

router.use(authenticate)

router.get('/admin', authorize('ADMIN'), analyticsController.getAdminMetrics.bind(analyticsController))
router.get('/driver', authorize('DRIVER'), analyticsController.getDriverMetrics.bind(analyticsController))

export default router

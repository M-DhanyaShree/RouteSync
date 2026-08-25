import { Router } from 'express'
import { authController } from './auth.controller'
import { authenticate } from '../../middleware/auth.middleware'
import { validate } from '../../middleware/validate.middleware'
import { registerSchema, loginSchema, refreshSchema, updateLocationSchema } from './auth.dto'

const router = Router()

router.post('/register', validate(registerSchema), authController.register.bind(authController))
router.post('/login',    validate(loginSchema),    authController.login.bind(authController))
router.post('/refresh',  validate(refreshSchema),  authController.refresh.bind(authController))
router.post('/logout',   authenticate,             authController.logout.bind(authController))
router.get('/me',        authenticate,             authController.me.bind(authController))

// Location Management for Student Pickup Spots
router.get('/location',  authenticate,             authController.getLocation.bind(authController))
router.post('/location', authenticate, validate(updateLocationSchema), authController.updateLocation.bind(authController))

export default router


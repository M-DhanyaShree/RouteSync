import { Router } from 'express'
import { groupsController } from './groups.controller'
import { authenticate, authorize } from '../../middleware/auth.middleware'
import { validate } from '../../middleware/validate.middleware'
import { createGroupSchema, updateGroupSchema, joinGroupSchema, createDestinationSchema } from './groups.dto'

const router = Router()

// All group routes require auth
router.use(authenticate)

router.post('/',    authorize('DRIVER'), validate(createGroupSchema), groupsController.create.bind(groupsController))
router.get('/my',                                                     groupsController.getMy.bind(groupsController))
router.post('/join', authorize('STUDENT'), validate(joinGroupSchema), groupsController.join.bind(groupsController))

router.get('/:id',                                                    groupsController.getOne.bind(groupsController))
router.put('/:id',   authorize('DRIVER'), validate(updateGroupSchema),groupsController.update.bind(groupsController))
router.delete('/:id',authorize('DRIVER'),                             groupsController.remove.bind(groupsController))
router.post('/:id/invite', authorize('DRIVER'),                       groupsController.refreshInviteCode.bind(groupsController))
router.delete('/:id/leave', authorize('STUDENT'),                     groupsController.leave.bind(groupsController))

// Destinations
router.post('/:id/destinations',   authorize('DRIVER'), validate(createDestinationSchema), groupsController.addDestination.bind(groupsController))
router.delete('/:id/destinations/:destId', authorize('DRIVER'),                            groupsController.removeDestination.bind(groupsController))

export default router

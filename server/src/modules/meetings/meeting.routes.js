import { Router } from 'express';
import * as meetingController from './meeting.controller.js';
import validate, { validateQuery } from '../../middleware/validate.js';
import { verifyToken, authorize } from '../../middleware/auth.js';
import { ROLES } from '../../constants/index.js';
import {
  createMeetingSchema,
  updateMeetingSchema,
  meetingNotesSchema,
  meetingsQuerySchema,
} from './meeting.validation.js';

const router = Router();

router.use(verifyToken);

router.get(
  '/',
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER, ROLES.EMPLOYEE),
  validateQuery(meetingsQuerySchema),
  meetingController.list,
);

router.get(
  '/:id',
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER, ROLES.EMPLOYEE),
  meetingController.getById,
);

router.post(
  '/',
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER),
  validate(createMeetingSchema),
  meetingController.create,
);

router.patch(
  '/:id',
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER),
  validate(updateMeetingSchema),
  meetingController.update,
);

router.patch(
  '/:id/notes',
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER, ROLES.EMPLOYEE),
  validate(meetingNotesSchema),
  meetingController.updateNotes,
);

router.delete(
  '/:id',
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN),
  meetingController.remove,
);

export default router;

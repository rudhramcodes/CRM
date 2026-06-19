import { Router } from 'express';
import * as leadController from './lead.controller.js';
import validate, { validateQuery } from '../../middleware/validate.js';
import { verifyToken, authorize } from '../../middleware/auth.js';
import { ROLES } from '../../constants/index.js';
import {
  createLeadSchema,
  updateLeadSchema,
  addNoteSchema,
  leadsQuerySchema,
} from './lead.validation.js';

const router = Router();

router.use(verifyToken);

router.get('/stats', authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER), leadController.stats);

router.get(
  '/',
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER, ROLES.EMPLOYEE),
  validateQuery(leadsQuerySchema),
  leadController.list,
);

router.get(
  '/:id',
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER, ROLES.EMPLOYEE),
  leadController.getById,
);

router.post(
  '/',
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER),
  validate(createLeadSchema),
  leadController.create,
);

router.post(
  '/:id/notes',
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER),
  validate(addNoteSchema),
  leadController.addNote,
);

router.patch(
  '/:id',
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER),
  validate(updateLeadSchema),
  leadController.update,
);

router.delete(
  '/:id',
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN),
  leadController.remove,
);

export default router;

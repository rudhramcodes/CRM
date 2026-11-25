import { Router } from 'express';
import * as clientController from './client.controller.js';
import validate, { validateQuery } from '../../middleware/validate.js';
import { verifyToken, authorize } from '../../middleware/auth.js';
import { restrictReadOnlyModule } from '../../middleware/readOnlyModules.js';
import { attachClientProfile } from '../../middleware/clientPortal.js';
import { ROLES } from '../../constants/index.js';
import {
  createClientSchema,
  updateClientSchema,
  clientsQuerySchema,
} from './client.validation.js';

const router = Router();

router.use(verifyToken);
router.use(restrictReadOnlyModule('clients'));

router.get('/stats', authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER, ROLES.EMPLOYEE), clientController.stats);

router.get(
  '/me',
  authorize(ROLES.CLIENT),
  attachClientProfile,
  clientController.getMyProfile,
);

router.get(
  '/',
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER, ROLES.EMPLOYEE),
  validateQuery(clientsQuerySchema),
  clientController.list,
);

router.get(
  '/:id',
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER, ROLES.EMPLOYEE),
  clientController.getById,
);

router.post(
  '/convert/:leadId',
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER),
  clientController.convertFromLead,
);

router.post(
  '/',
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER),
  validate(createClientSchema),
  clientController.create,
);

router.patch(
  '/:id',
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER),
  validate(updateClientSchema),
  clientController.update,
);

router.delete(
  '/:id',
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN),
  clientController.remove,
);

export default router;

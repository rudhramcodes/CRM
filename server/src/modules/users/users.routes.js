import { Router } from 'express';
import * as usersController from './users.controller.js';
import validate, { validateQuery } from '../../middleware/validate.js';
import { verifyToken, authorize } from '../../middleware/auth.js';
import {
  createUserSchema,
  updateUserSchema,
  updateUserRoleSchema,
  usersQuerySchema,
} from './users.validation.js';
import { ROLES } from '../../constants/index.js';

const router = Router();

router.use(verifyToken);

router.get(
  '/stats',
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN),
  usersController.stats,
);

router.get(
  '/',
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER),
  validateQuery(usersQuerySchema),
  usersController.list,
);

router.get(
  '/:id',
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER),
  usersController.getById,
);

router.post(
  '/',
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN),
  validate(createUserSchema),
  usersController.create,
);

router.patch(
  '/:id',
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN),
  validate(updateUserSchema),
  usersController.update,
);

router.patch(
  '/:id/role',
  authorize(ROLES.SUPER_ADMIN),
  validate(updateUserRoleSchema),
  usersController.changeRole,
);

router.delete(
  '/:id',
  authorize(ROLES.SUPER_ADMIN),
  usersController.remove,
);

export default router;

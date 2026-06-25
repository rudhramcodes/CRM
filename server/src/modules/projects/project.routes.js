import { Router } from 'express';
import * as projectController from './project.controller.js';
import validate, { validateQuery } from '../../middleware/validate.js';
import { verifyToken, authorize } from '../../middleware/auth.js';
import { ROLES } from '../../constants/index.js';
import {
  createProjectSchema,
  updateProjectSchema,
  projectsQuerySchema,
  addTaskSchema,
  updateTaskSchema,
} from './project.validation.js';

const router = Router();

router.use(verifyToken);

router.get(
  '/stats',
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER),
  projectController.stats,
);

router.get(
  '/',
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER, ROLES.EMPLOYEE),
  validateQuery(projectsQuerySchema),
  projectController.list,
);

router.get(
  '/:id',
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER, ROLES.EMPLOYEE),
  projectController.getById,
);

router.post(
  '/',
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER),
  validate(createProjectSchema),
  projectController.create,
);

router.patch(
  '/:id',
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER),
  validate(updateProjectSchema),
  projectController.update,
);

router.delete(
  '/:id',
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN),
  projectController.remove,
);

// Activities - viewable by all project roles
router.get(
  '/:id/activities',
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER, ROLES.EMPLOYEE),
  projectController.getActivities,
);

// Tasks - only super_admin/admin can create/edit/delete
router.post(
  '/:id/tasks',
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN),
  validate(addTaskSchema),
  projectController.addTask,
);

router.patch(
  '/:id/tasks/:taskId',
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN),
  validate(updateTaskSchema),
  projectController.updateTask,
);

router.delete(
  '/:id/tasks/:taskId',
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN),
  projectController.deleteTask,
);

export default router;

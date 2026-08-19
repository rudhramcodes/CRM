import { Router } from 'express';
import multer from 'multer';
import * as projectController from './project.controller.js';
import validate, { validateQuery } from '../../middleware/validate.js';
import { verifyToken, authorize } from '../../middleware/auth.js';
import { attachClientProfile } from '../../middleware/clientPortal.js';
import { ROLES } from '../../constants/index.js';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
import {
  createProjectSchema,
  updateProjectSchema,
  projectsQuerySchema,
  addTaskSchema,
  updateTaskSchema,
} from './project.validation.js';

const router = Router();

router.use(verifyToken);

const STAFF = [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER, ROLES.EMPLOYEE];
const projectReadAuth = [authorize(...STAFF, ROLES.CLIENT), attachClientProfile];

router.get(
  '/stats',
  authorize(...STAFF),
  projectController.stats,
);

router.get(
  '/',
  ...projectReadAuth,
  validateQuery(projectsQuerySchema),
  projectController.list,
);

router.get(
  '/:id',
  ...projectReadAuth,
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

// Messages - viewable + postable by staff and the linked client (client scoped in service)
router.get(
  '/:id/messages',
  ...projectReadAuth,
  projectController.getMessages,
);

router.post(
  '/:id/messages',
  authorize(...STAFF, ROLES.CLIENT),
  attachClientProfile,
  upload.array('images', 5),
  projectController.addMessage,
);

router.delete(
  '/:id/messages/:messageId',
  authorize(...STAFF, ROLES.CLIENT),
  attachClientProfile,
  projectController.deleteMessage,
);

// Activities - viewable by staff + linked client
router.get(
  '/:id/activities',
  ...projectReadAuth,
  projectController.getActivities,
);

// Milestones - embedded in the project; editable by employees too (create/edit), delete only by admin
router.patch(
  '/:id/milestones',
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER, ROLES.EMPLOYEE),
  validate(updateProjectSchema),
  projectController.update,
);

// Tasks - employees can create/edit, only admin deletes
router.post(
  '/:id/tasks',
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER, ROLES.EMPLOYEE),
  validate(addTaskSchema),
  projectController.addTask,
);

router.patch(
  '/:id/tasks/:taskId',
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER, ROLES.EMPLOYEE),
  validate(updateTaskSchema),
  projectController.updateTask,
);

router.delete(
  '/:id/tasks/:taskId',
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN),
  projectController.deleteTask,
);

export default router;

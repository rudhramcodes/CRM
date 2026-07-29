import { Router } from 'express';
import { verifyToken } from '../../middleware/auth.js';
import { authorize } from '../../middleware/auth.js';
import validate, { validateQuery } from '../../middleware/validate.js';
import { ROLES } from '../../constants/index.js';
import {
  createTaskSchema, updateTaskSchema, tasksQuerySchema,
  addDependencySchema, addTimeEntrySchema, addChecklistSchema,
  updateChecklistSchema, reorderChecklistSchema, reorderTasksSchema,
  bulkUpdateSchema, addCommentSchema,
} from './task.validation.js';
import * as ctrl from './task.controller.js';

const router = Router();
router.use(verifyToken);

// Must be before /:id routes to avoid Express matching as id param
router.get('/watching', ctrl.getWatchedTasks);
router.patch('/reorder', authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER, ROLES.EMPLOYEE), validate(reorderTasksSchema), ctrl.reorderTasks);
router.patch('/bulk', authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER, ROLES.EMPLOYEE), validate(bulkUpdateSchema), ctrl.bulkUpdate);

// Core CRUD
router.get('/', validateQuery(tasksQuerySchema), ctrl.list);
router.get('/:id', ctrl.getById);
router.post('/', authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER), validate(createTaskSchema), ctrl.create);
router.patch('/:id', authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER, ROLES.EMPLOYEE), validate(updateTaskSchema), ctrl.update);
router.delete('/:id', authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN), ctrl.remove);

// Subtasks
router.get('/:id/subtasks', ctrl.getSubtasks);

// Dependencies
router.get('/:id/dependencies', ctrl.getDependencies);
router.post('/:id/dependencies', authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER, ROLES.EMPLOYEE), validate(addDependencySchema), ctrl.addDependency);
router.delete('/:id/dependencies/:depId', authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER, ROLES.EMPLOYEE), ctrl.removeDependency);

// Comments — all except client
router.post('/:id/comments', authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER, ROLES.EMPLOYEE), validate(addCommentSchema), ctrl.addComment);

// Checklists — all except client (delete restricted to admin+)
router.post('/:id/checklist', authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER, ROLES.EMPLOYEE), validate(addChecklistSchema), ctrl.addChecklistItem);
router.patch('/:id/checklist/:itemId', authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER, ROLES.EMPLOYEE), validate(updateChecklistSchema), ctrl.updateChecklistItem);
router.delete('/:id/checklist/:itemId', authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN), ctrl.removeChecklistItem);

// Watchers
router.post('/:id/watch', ctrl.watchTask);
router.delete('/:id/watch', ctrl.unwatchTask);

// Time Tracking
router.post('/:id/time', validate(addTimeEntrySchema), ctrl.addTimeEntry);
router.delete('/:id/time/:entryId', ctrl.removeTimeEntry);

export default router;

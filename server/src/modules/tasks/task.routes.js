import { Router } from 'express';
import { verifyToken } from '../../middleware/auth.js';
import { authorize } from '../../middleware/auth.js';
import { attachClientProfile } from '../../middleware/clientPortal.js';
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

const STAFF = [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER, ROLES.EMPLOYEE];
const taskReadAuth = [authorize(...STAFF, ROLES.CLIENT), attachClientProfile];

// Must be before /:id routes to avoid Express matching as id param
router.get('/watching', ...taskReadAuth, ctrl.getWatchedTasks);
router.patch('/reorder', authorize(...STAFF), validate(reorderTasksSchema), ctrl.reorderTasks);
router.patch('/bulk', authorize(...STAFF), validate(bulkUpdateSchema), ctrl.bulkUpdate);

// Core CRUD
router.get('/', ...taskReadAuth, validateQuery(tasksQuerySchema), ctrl.list);
router.get('/:id', ...taskReadAuth, ctrl.getById);
router.post('/', authorize(...STAFF), validate(createTaskSchema), ctrl.create);
router.patch('/:id', authorize(...STAFF), validate(updateTaskSchema), ctrl.update);
router.delete('/:id', authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN), ctrl.remove);

// Subtasks
router.get('/:id/subtasks', ...taskReadAuth, ctrl.getSubtasks);

// Dependencies
router.get('/:id/dependencies', ...taskReadAuth, ctrl.getDependencies);
router.post('/:id/dependencies', authorize(...STAFF), validate(addDependencySchema), ctrl.addDependency);
router.delete('/:id/dependencies/:depId', authorize(...STAFF), ctrl.removeDependency);

// Comments — staff + client (client scoped + own-delete enforced in service)
router.post('/:id/comments', authorize(...STAFF, ROLES.CLIENT), attachClientProfile, validate(addCommentSchema), ctrl.addComment);
router.delete('/:id/comments/:commentId', authorize(...STAFF, ROLES.CLIENT), attachClientProfile, ctrl.removeComment);

// Checklists — staff only
router.post('/:id/checklist', authorize(...STAFF), validate(addChecklistSchema), ctrl.addChecklistItem);
router.patch('/:id/checklist/:itemId', authorize(...STAFF), validate(updateChecklistSchema), ctrl.updateChecklistItem);
router.delete('/:id/checklist/:itemId', authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN), ctrl.removeChecklistItem);

// Watchers — staff only (client blocked)
router.post('/:id/watch', authorize(...STAFF), ctrl.watchTask);
router.delete('/:id/watch', authorize(...STAFF), ctrl.unwatchTask);

// Time Tracking — staff only (client blocked)
router.post('/:id/time', authorize(...STAFF), validate(addTimeEntrySchema), ctrl.addTimeEntry);
router.delete('/:id/time/:entryId', authorize(...STAFF), ctrl.removeTimeEntry);

export default router;

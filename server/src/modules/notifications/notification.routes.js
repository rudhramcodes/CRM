import { Router } from 'express';
import { verifyToken } from '../../middleware/auth.js';
import { authorize } from '../../middleware/auth.js';
import * as ctrl from './notification.controller.js';
import { validateQuery } from '../../middleware/validate.js';
import { notificationsQuerySchema } from './notification.validation.js';

const router = Router();
router.use(verifyToken);

router.get('/', validateQuery(notificationsQuerySchema), ctrl.list);
router.get('/unread-count', ctrl.unreadCount);
router.patch('/read-all', ctrl.markAllRead);
router.patch('/:id/read', ctrl.markRead);
router.delete('/old/cleanup', authorize('super_admin', 'admin'), ctrl.cleanupOld);
router.delete('/:id', ctrl.remove);

export default router;

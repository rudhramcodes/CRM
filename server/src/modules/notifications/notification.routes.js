import { Router } from 'express';
import { verifyToken } from '../../middleware/auth.js';
import * as ctrl from './notification.controller.js';

const router = Router();
router.use(verifyToken);

router.get('/', ctrl.list);
router.get('/unread-count', ctrl.unreadCount);
router.patch('/:id/read', ctrl.markRead);
router.patch('/read-all', ctrl.markAllRead);

export default router;

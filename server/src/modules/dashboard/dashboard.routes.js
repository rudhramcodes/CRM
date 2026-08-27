import { Router } from 'express';
import { getDashboardOverview, getVentureData } from './dashboard.controller.js';
import { verifyToken, authorize } from '../../middleware/auth.js';
import { ROLES } from '../../constants/index.js';

const router = Router();

router.use(verifyToken);

router.get('/', authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER), getDashboardOverview);
router.get('/venture/:brand', authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER), getVentureData);

export default router;

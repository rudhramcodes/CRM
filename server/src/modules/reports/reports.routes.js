import { Router } from 'express';
import * as reportsController from './reports.controller.js';
import { verifyToken, authorize } from '../../middleware/auth.js';
import { validateQuery } from '../../middleware/validate.js';
import { ROLES } from '../../constants/index.js';
import { reportsQuerySchema } from './reports.validation.js';

const router = Router();

router.use(verifyToken);

router.get(
  '/',
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN),
  validateQuery(reportsQuerySchema),
  reportsController.getReport,
);

export default router;

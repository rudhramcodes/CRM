import { Router } from 'express';
import * as payrollController from './payroll.controller.js';
import validate, { validateQuery } from '../../middleware/validate.js';
import { verifyToken } from '../../middleware/auth.js';
import { requirePayrollAccess } from '../../utils/payrollAccess.js';
import {
  generatePayrollSchema,
  payrollRunsQuerySchema,
  reopenPayrollSchema,
} from './payroll.validation.js';

const router = Router();

router.use(verifyToken);

router.get('/my-slips', payrollController.mySlips);
router.get('/slips/:id/pdf', payrollController.slipPdf);

router.get('/runs', requirePayrollAccess, validateQuery(payrollRunsQuerySchema), payrollController.listRuns);
router.post('/runs', requirePayrollAccess, validate(generatePayrollSchema), payrollController.generate);
router.get('/runs/:id', requirePayrollAccess, payrollController.getById);
router.post('/runs/:id/finalize', requirePayrollAccess, payrollController.finalize);
router.post('/runs/:id/reopen', requirePayrollAccess, validate(reopenPayrollSchema), payrollController.reopen);

export default router;

import { Router } from 'express';
import * as quotationController from './quotation.controller.js';
import validate, { validateQuery } from '../../middleware/validate.js';
import { verifyToken, authorize } from '../../middleware/auth.js';
import { ROLES } from '../../constants/index.js';
import {
  createQuotationSchema,
  updateQuotationSchema,
  updateQuotationStatusSchema,
  quotationsQuerySchema,
} from './quotation.validation.js';

const router = Router();

router.use(verifyToken);
router.use(authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN));

router.get('/stats', quotationController.stats);
router.get('/', validateQuery(quotationsQuerySchema), quotationController.list);
router.get('/:id', quotationController.getById);
router.get('/:id/html', quotationController.getHtml);
router.get('/:id/pdf', quotationController.downloadPdf);
router.post('/', validate(createQuotationSchema), quotationController.create);
router.patch('/:id', validate(updateQuotationSchema), quotationController.update);
router.patch(
  '/:id/status',
  validate(updateQuotationStatusSchema),
  quotationController.updateStatus,
);
router.post('/:id/resend', quotationController.resendEmail);
router.delete('/:id', quotationController.remove);

export default router;

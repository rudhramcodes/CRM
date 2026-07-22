import { Router } from 'express';
import * as invoiceController from './invoice.controller.js';
import validate, { validateQuery } from '../../middleware/validate.js';
import { verifyToken, authorize } from '../../middleware/auth.js';
import { ROLES } from '../../constants/index.js';
import {
  createInvoiceSchema,
  updateInvoiceSchema,
  updateInvoiceStatusSchema,
  invoicesQuerySchema,
} from './invoice.validation.js';

const router = Router();

router.use(verifyToken);

router.get(
  '/stats',
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN),
  invoiceController.stats,
);

router.get(
  '/',
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN),
  validateQuery(invoicesQuerySchema),
  invoiceController.list,
);

router.get(
  '/:id',
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN),
  invoiceController.getById,
);

router.get(
  '/:id/html',
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN),
  invoiceController.getHtml,
);

router.get(
  '/:id/pdf',
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN),
  invoiceController.downloadPdf,
);

router.post(
  '/',
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN),
  validate(createInvoiceSchema),
  invoiceController.create,
);

router.patch(
  '/:id',
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN),
  validate(updateInvoiceSchema),
  invoiceController.update,
);

router.patch(
  '/:id/status',
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN),
  validate(updateInvoiceStatusSchema),
  invoiceController.updateStatus,
);

router.post(
  '/:id/resend',
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN),
  invoiceController.resendEmail,
);

router.delete(
  '/:id',
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN),
  invoiceController.remove,
);

export default router;

import { Router } from 'express';
import * as paymentController from './payment.controller.js';
import validate, { validateQuery } from '../../middleware/validate.js';
import { verifyToken, authorize } from '../../middleware/auth.js';
import { ROLES } from '../../constants/index.js';
import {
  createPaymentSchema,
  updatePaymentSchema,
  paymentsQuerySchema,
} from './payment.validation.js';

const router = Router();

router.use(verifyToken);

router.get(
  '/stats',
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN),
  paymentController.stats,
);

router.get(
  '/',
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN),
  validateQuery(paymentsQuerySchema),
  paymentController.list,
);

router.get(
  '/:id/receipt',
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN),
  paymentController.downloadReceipt,
);

router.get(
  '/:id',
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN),
  paymentController.getById,
);

router.get(
  '/invoice/:invoiceId',
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN),
  paymentController.invoicePayments,
);

router.post(
  '/',
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN),
  validate(createPaymentSchema),
  paymentController.create,
);

router.patch(
  '/:id',
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN),
  validate(updatePaymentSchema),
  paymentController.update,
);

router.delete(
  '/:id',
  authorize(ROLES.SUPER_ADMIN),
  paymentController.remove,
);

export default router;

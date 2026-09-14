import { Router } from 'express';
import * as leadPublicController from './lead.public.controller.js';
import validate from '../../middleware/validate.js';
import { createLeadSchema } from './lead.validation.js';

const router = Router();

// Public endpoint to submit a lead (no auth required)
router.post(
  '/inquiry',
  validate(createLeadSchema),
  leadPublicController.createPublicLead
);

export default router;

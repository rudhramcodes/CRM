import { Router } from 'express';
import validate from '../../middleware/validate.js';
import { createFreelancerSchema } from './freelancer.validation.js';
import * as freelancerService from './freelancer.service.js';
import { sendFreelancerSubmissionEmail, sendFreelancerApplicantEmail } from '../../services/emailService.js';
import logger from '../../utils/logger.js';

const router = Router();

router.post('/apply', validate(createFreelancerSchema), async (req, res, next) => {
  try {
    const normalized = {
      ...req.body,
      email: req.body.email?.trim().toLowerCase() || '',
      displayName: req.body.displayName?.trim() || req.body.fullName,
      ventureProfiles: req.body.ventureProfiles?.map((profile) => ({
        ...profile,
        serviceCategories: [...new Set(profile.serviceCategories || [])],
      })),
    };

    const { findByPhone, findByEmail } = await import('./freelancer.repository.js');
    const [phoneMatch, emailMatch] = await Promise.all([
      findByPhone(normalized.phone),
      normalized.email ? findByEmail(normalized.email) : null,
    ]);

    if (phoneMatch) {
      return res.status(409).json({
        success: false,
        message: `A freelancer already uses this phone number (${phoneMatch.fullName})`,
      });
    }

    if (emailMatch) {
      return res.status(409).json({
        success: false,
        message: `A freelancer already uses this email address (${emailMatch.fullName})`,
      });
    }

    const count = await freelancerService.countByStatus();
    const total = count.reduce((sum, item) => sum + item.count, 0) + 1;
    const freelancerCode = `FRL-${String(total).padStart(5, '0')}`;

    // Public applications intentionally have no req.user. The service keeps
    // createdBy/updatedBy empty until an internal user takes ownership.
    const freelancer = await freelancerService.create({
      ...normalized,
      freelancerCode,
      status: 'inactive',
    }, null);

    try {
      await sendFreelancerSubmissionEmail(freelancer);
    } catch (emailErr) {
      logger.warn(`Failed to send freelancer submission email: ${emailErr.message}`);
    }

    try {
      await sendFreelancerApplicantEmail(freelancer);
    } catch (emailErr) {
      logger.warn(`Failed to send freelancer applicant email: ${emailErr.message}`);
    }

    res.status(201).json({
      success: true,
      message: 'Freelancer profile submitted successfully',
      data: { freelancer },
    });
  } catch (error) {
    next(error);
  }
});

export default router;

import { Router } from 'express';
import * as authController from './auth.controller.js';
import validate from '../../middleware/validate.js';
import { verifyToken } from '../../middleware/auth.js';
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
  resendVerificationSchema,
} from './auth.validation.js';

const router = Router();

router.post('/register', validate(registerSchema), authController.register);
router.post('/login', validate(loginSchema), authController.login);
router.post('/logout', verifyToken, authController.logout);
router.post('/refresh-token', authController.refresh);
router.get('/me', verifyToken, authController.getMe);
router.post('/forgot-password', validate(forgotPasswordSchema), authController.forgotPassword);
router.post('/reset-password', validate(resetPasswordSchema), authController.resetPassword);
router.post('/verify-email', validate(verifyEmailSchema), authController.verifyEmail);
router.post('/resend-verification', validate(resendVerificationSchema), authController.resendVerification);

export default router;

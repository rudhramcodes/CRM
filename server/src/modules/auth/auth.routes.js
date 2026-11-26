import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import ApiError from '../../utils/ApiError.js';
import * as authController from './auth.controller.js';
import validate from '../../middleware/validate.js';
import { verifyToken, authorize } from '../../middleware/auth.js';
import { ROLES } from '../../constants/index.js';
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
  verifyEmailOtpSchema,
  resendVerificationSchema,
  updateProfileSchema,
  changePasswordSchema,
  pushTokenSchema,
} from './auth.validation.js';

const router = Router();

// Stricter rate limits for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many attempts, please try again later' },
});

// Registration disabled — admins create users via POST /api/users
// router.post('/register', authLimiter, validate(registerSchema), authController.register);
router.post('/login', authLimiter, validate(loginSchema), authController.login);
router.post('/forgot-password', authLimiter, validate(forgotPasswordSchema), authController.forgotPassword);
router.post('/reset-password', authLimiter, validate(resetPasswordSchema), authController.resetPassword);
router.post('/logout', verifyToken, authController.logout);
router.post('/refresh-token', authController.refresh);
router.get('/me', verifyToken, authController.getMe);
router.post('/push-token', verifyToken, validate(pushTokenSchema), authController.addPushToken);
router.delete('/push-token', verifyToken, validate(pushTokenSchema), authController.removePushToken);
router.post('/verify-email', authLimiter, validate(verifyEmailSchema), authController.verifyEmail);
router.post('/verify-email-otp', authLimiter, validate(verifyEmailOtpSchema), authController.verifyEmailOtp);
router.post('/resend-verification', authLimiter, validate(resendVerificationSchema), authController.resendVerification);

router.patch('/profile', verifyToken, validate(updateProfileSchema), authController.updateProfile);
// Own profile photo (mobile settings): one image, 5 MB, same limits as the freelancer photo upload.
const avatarUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 }, fileFilter: (_req, f, cb) => cb(null, f.mimetype.startsWith('image/')) });
const avatarFile = (req, res, next) => avatarUpload.single('file')(req, res, (err) => next(err && ApiError.badRequest(err.code === 'LIMIT_FILE_SIZE' ? 'Photo must be 5 MB or less' : err.message)));
router.post('/profile/avatar', verifyToken, avatarFile, authController.uploadAvatar);
router.put('/password', verifyToken, validate(changePasswordSchema), authController.changePassword);

router.post('/complete-onboarding', verifyToken, authorize(ROLES.CLIENT), authController.completeOnboarding);

export default router;

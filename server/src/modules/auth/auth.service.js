import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import config from '../../config/index.js';
import ApiError from '../../utils/ApiError.js';
import logger from '../../utils/logger.js';
import * as authRepository from './auth.repository.js';
import { sendPasswordResetEmail, sendVerificationEmail, sendWelcomeEmail } from '../../services/emailService.js';
import { validatePasswordAgainstPolicy } from '../settings/settings.service.js';
import { ROLES } from '../../constants/index.js';

const generateTokens = async (user) => {
  const accessToken = user.generateAccessToken();
  const refreshToken = user.generateRefreshToken();

  await authRepository.updateRefreshToken(user._id, refreshToken);

  return { accessToken, refreshToken };
};

const OTP_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes
const OTP_MAX_ATTEMPTS = 5;

const generateOtp = () => {
  const bytes = crypto.randomBytes(3);
  const otp = (bytes.readUIntBE(0, 3) % 1000000).toString().padStart(6, '0');
  return otp;
};

const hashOtp = (otp) => crypto.createHash('sha256').update(otp).digest('hex');

export const issueVerificationOtp = async (user) => {
  const otp = generateOtp();
  if (config.nodeEnv === 'development') logger.info(`[DEV OTP] ${user.email}: ${otp}`);
  await authRepository.updateUser(user._id, {
    emailVerificationToken: hashOtp(otp),
    emailVerificationExpires: new Date(Date.now() + OTP_EXPIRY_MS),
    emailVerificationAttempts: 0,
  });
  sendVerificationEmail(user.email, otp).catch((err) => logger.error(`Verification email failed: ${err.message}`));
  return otp;
};

export const registerUser = async (userData) => {
  const existingUser = await authRepository.findByEmail(userData.email);
  if (existingUser) {
    throw ApiError.conflict('Email already registered');
  }

  const policyErrors = await validatePasswordAgainstPolicy(userData.password);
  if (policyErrors.length) {
    throw ApiError.badRequest(policyErrors.join('; '));
  }

  const user = await authRepository.createUser({
    ...userData,
    emailVerificationToken: hashOtp(generateOtp()),
    emailVerificationExpires: new Date(Date.now() + OTP_EXPIRY_MS),
  });

  const tokens = await generateTokens(user);

  // Fire-and-forget emails
  sendWelcomeEmail(userData.email, userData.name);
  issueVerificationOtp(user).catch(() => {});

  const userObj = user.toJSON();
  return { user: userObj, ...tokens };
};

export const loginUser = async (email, password) => {
  const user = await authRepository.findByEmail(email);
  if (!user) {
    throw ApiError.unauthorized('Invalid email or password');
  }

  if (!user.isActive) {
    throw ApiError.forbidden('Account has been deactivated');
  }

  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    throw ApiError.unauthorized('Invalid email or password');
  }

  const tokens = await generateTokens(user);
  const userObj = user.toJSON();
  return { user: userObj, mustChangePassword: user.mustChangePassword || false, ...tokens };
};

export const logoutUser = async (userId) => {
  await authRepository.updateRefreshToken(userId, null);
};

export const refreshAccessToken = async (refreshToken) => {
  if (!refreshToken) {
    throw ApiError.unauthorized('Refresh token is required');
  }

  let decoded;
  try {
    decoded = jwt.verify(refreshToken, config.jwt.refreshSecret);
  } catch {
    throw ApiError.unauthorized('Invalid or expired refresh token');
  }

  const user = await authRepository.findByIdWithPassword(decoded.userId);
  if (!user || !user.refreshToken || user.refreshToken !== refreshToken) {
    throw ApiError.unauthorized('Invalid refresh token');
  }

  const tokens = await generateTokens(user);
  return tokens;
};

export const getCurrentUser = async (userId) => {
  const user = await authRepository.findById(userId);
  if (!user) {
    throw ApiError.notFound('User not found');
  }
  return user;
};

export const forgotPassword = async (email) => {
  const user = await authRepository.findByEmail(email);
  if (!user) {
    // Don't reveal whether the email exists
    return;
  }

  const resetToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

  await authRepository.updateUser(user._id, {
    passwordResetToken: hashedToken,
    passwordResetExpires: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
  });

  await sendPasswordResetEmail(email, resetToken);
};

export const resetPassword = async (token, newPassword) => {
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  const user = await authRepository.findOneByToken('passwordResetToken', hashedToken);
  if (!user) {
    throw ApiError.badRequest('Invalid or expired reset token');
  }

  if (!user.passwordResetExpires || user.passwordResetExpires < new Date()) {
    throw ApiError.badRequest('Reset token has expired');
  }

  const policyErrors = await validatePasswordAgainstPolicy(newPassword);
  if (policyErrors.length) {
    throw ApiError.badRequest(policyErrors.join('; '));
  }

  user.password = newPassword;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  // Invalidate all refresh tokens on password reset
  await authRepository.updateRefreshToken(user._id, null);
};

export const verifyEmail = async (token) => {
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  const user = await authRepository.findOneByToken('emailVerificationToken', hashedToken);
  if (!user) {
    throw ApiError.badRequest('Invalid or expired verification token');
  }

  if (!user.emailVerificationExpires || user.emailVerificationExpires < new Date()) {
    throw ApiError.badRequest('Verification token has expired');
  }

  user.isEmailVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpires = undefined;
  await user.save();

  return user;
};

export const verifyEmailOtp = async (email, otp) => {
  const user = await authRepository.findByEmailWithSecrets(email);
  if (!user) {
    throw ApiError.badRequest('Invalid verification code');
  }

  if (user.isEmailVerified) {
    throw ApiError.badRequest('Email is already verified');
  }

  if (!user.emailVerificationExpires || user.emailVerificationExpires < new Date()) {
    throw ApiError.badRequest('Verification code has expired. Request a new one.');
  }

  if (user.emailVerificationAttempts >= OTP_MAX_ATTEMPTS) {
    throw ApiError.badRequest('Too many failed attempts. Request a new code.');
  }

  const hashed = hashOtp(otp);
  if (!user.emailVerificationToken || user.emailVerificationToken !== hashed) {
    await authRepository.updateUser(user._id, {
      emailVerificationAttempts: (user.emailVerificationAttempts || 0) + 1,
    });
    throw ApiError.badRequest('Incorrect verification code');
  }

  user.isEmailVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpires = undefined;
  user.emailVerificationAttempts = undefined;
  await user.save();

  return user;
};

export const resendVerification = async (email) => {
  const user = await authRepository.findByEmailWithSecrets(email);
  if (!user) {
    return;
  }

  if (user.isEmailVerified) {
    throw ApiError.badRequest('Email is already verified');
  }

  await issueVerificationOtp(user);
};

export const updateProfile = async (userId, data) => {
  const allowed = ['name', 'phone', 'avatar'];
  const updates = {};
  for (const key of allowed) {
    if (data[key] !== undefined) updates[key] = data[key];
  }
  if (!Object.keys(updates).length) throw ApiError.badRequest('Nothing to update');

  // If email is being changed, check it's not taken
  if (data.email && data.email !== (await authRepository.findById(userId)).email) {
    const existing = await authRepository.findByEmail(data.email);
    if (existing) throw ApiError.conflict('Email already in use');
    updates.email = data.email;
  }

  const user = await authRepository.updateUser(userId, updates);
  if (!user) throw ApiError.notFound('User not found');
  return user;
};

export const changePassword = async (userId, currentPassword, newPassword) => {
  const user = await authRepository.findByIdWithPassword(userId);
  if (!user) throw ApiError.notFound('User not found');

  const isValid = await user.comparePassword(currentPassword);
  if (!isValid) throw ApiError.badRequest('Current password is incorrect');

  const policyErrors = await validatePasswordAgainstPolicy(newPassword);
  if (policyErrors.length) {
    throw ApiError.badRequest(policyErrors.join('; '));
  }

  user.password = newPassword;
  await user.save();
};

export const acceptClientInvite = async ({ token, password }) => {
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  const clientRepository = await import('../clients/client.repository.js');
  const client = await clientRepository.findOneByPortalInviteToken(hashedToken);
  if (!client) {
    throw ApiError.badRequest('Invite token is invalid or has expired');
  }

  if (!client.portalInviteExpires || client.portalInviteExpires < new Date()) {
    throw ApiError.badRequest('Invite token has expired');
  }

  const user = await authRepository.findById(client.user);
  if (!user) {
    throw ApiError.badRequest('Portal account not found — please contact support');
  }

  const policyErrors = await validatePasswordAgainstPolicy(password);
  if (policyErrors.length) {
    throw ApiError.badRequest(policyErrors.join('; '));
  }

  user.password = password;
  user.isEmailVerified = true;
  user.isActive = true;
  await user.save();

  client.portalInviteToken = null;
  client.portalInviteExpires = null;
  await client.save();

  return user;
};

export const completeOnboarding = async (userId) => {
  const user = await authRepository.updateUser(userId, { onboardingCompleted: true });
  if (!user) throw ApiError.notFound('User not found');
  return user;
};

export const getMeWithClient = async (user) => {
  if (user.role !== ROLES.CLIENT) {
    return user;
  }
  const clientRepository = await import('../clients/client.repository.js');
  const client = await clientRepository.findOneByUser(user._id);
  const userObj = user.toJSON ? user.toJSON() : user;
  return { ...userObj, clientId: client?._id ?? null };
};

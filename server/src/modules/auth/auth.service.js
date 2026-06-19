import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import config from '../../config/index.js';
import ApiError from '../../utils/ApiError.js';
import * as authRepository from './auth.repository.js';
import { sendPasswordResetEmail, sendVerificationEmail, sendWelcomeEmail } from '../../services/emailService.js';

const generateTokens = async (user) => {
  const accessToken = user.generateAccessToken();
  const refreshToken = user.generateRefreshToken();

  await authRepository.updateRefreshToken(user._id, refreshToken);

  return { accessToken, refreshToken };
};

export const registerUser = async (userData) => {
  const existingUser = await authRepository.findByEmail(userData.email);
  if (existingUser) {
    throw ApiError.conflict('Email already registered');
  }

  const verificationToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(verificationToken).digest('hex');

  const user = await authRepository.createUser({
    ...userData,
    emailVerificationToken: hashedToken,
    emailVerificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
  });

  const tokens = await generateTokens(user);

  // Fire-and-forget emails
  sendWelcomeEmail(userData.email, userData.name);
  sendVerificationEmail(userData.email, verificationToken);

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
  return { user: userObj, ...tokens };
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

export const resendVerification = async (email) => {
  const user = await authRepository.findByEmailWithSecrets(email);
  if (!user) {
    return;
  }

  if (user.isEmailVerified) {
    throw ApiError.badRequest('Email is already verified');
  }

  const verificationToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(verificationToken).digest('hex');

  await authRepository.updateUser(user._id, {
    emailVerificationToken: hashedToken,
    emailVerificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
  });

  await sendVerificationEmail(email, verificationToken);
};

import crypto from 'crypto';
import ApiError from '../../utils/ApiError.js';
import { escapeRegex } from '../../utils/pagination.js';
import * as authRepository from '../auth/auth.repository.js';
import { ROLE_PERMISSIONS } from '../../constants/index.js';
import { sendWelcomeEmail, sendVerificationEmail } from '../../services/emailService.js';

export const listUsers = async (query, options) => {
  const filter = {};

  if (query.search) {
    const searchRegex = new RegExp(escapeRegex(query.search), 'i');
    filter.$or = [{ name: searchRegex }, { email: searchRegex }];
  }

  if (query.role) {
    filter.role = query.role;
  }

  if (query.isActive !== undefined) {
    filter.isActive = query.isActive;
  }

  return authRepository.findAllUsers(filter, options);
};

export const getUserById = async (id) => {
  const user = await authRepository.findById(id);
  if (!user) {
    throw ApiError.notFound('User not found');
  }
  return user;
};

export const createUser = async (userData, createdBy) => {
  const existingUser = await authRepository.findByEmail(userData.email);
  if (existingUser) {
    throw ApiError.conflict('Email already registered');
  }

  const role = userData.role || 'employee';

  // Assign default permissions for the role
  const permissions = ROLE_PERMISSIONS[role] || [];

  const verificationToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(verificationToken).digest('hex');

  const user = await authRepository.createUser({
    ...userData,
    role,
    permissions,
    createdBy: createdBy?._id,
    emailVerificationToken: hashedToken,
    emailVerificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
  });

  sendWelcomeEmail(userData.email, userData.name);
  sendVerificationEmail(userData.email, verificationToken);

  return user;
};

export const updateUser = async (id, updateData, updatedBy) => {
  const user = await authRepository.findById(id);
  if (!user) {
    throw ApiError.notFound('User not found');
  }

  // If role is changing, update permissions
  if (updateData.role && updateData.role !== user.role) {
    updateData.permissions = ROLE_PERMISSIONS[updateData.role] || [];
    updateData.updatedBy = updatedBy?._id;
  }

  const updated = await authRepository.updateUser(id, updateData);
  return updated;
};

export const deleteUser = async (id) => {
  const user = await authRepository.findById(id);
  if (!user) {
    throw ApiError.notFound('User not found');
  }

  if (user.role === 'super_admin') {
    throw ApiError.badRequest('Cannot delete super admin');
  }

  await authRepository.deleteUserById(id);
};

export const updateUserRole = async (id, role) => {
  const user = await authRepository.findById(id);
  if (!user) {
    throw ApiError.notFound('User not found');
  }

  if (user.role === 'super_admin') {
    throw ApiError.badRequest('Cannot change super admin role');
  }

  const permissions = ROLE_PERMISSIONS[role] || [];
  return authRepository.updateUser(id, { role, permissions });
};

export const getUserStats = async () => {
  const { ROLES } = await import('../../constants/index.js');
  const stats = {};

  for (const role of Object.values(ROLES)) {
    stats[role] = await authRepository.countByRole(role);
  }

  stats.total = Object.values(stats).reduce((a, b) => a + b, 0);

  return stats;
};

import ApiError from '../../utils/ApiError.js';
import { escapeRegex } from '../../utils/pagination.js';
import * as authRepository from '../auth/auth.repository.js';
import { issueVerificationOtp } from '../auth/auth.service.js';
import { ROLE_PERMISSIONS } from '../../constants/index.js';
import { sendWelcomeEmail } from '../../services/emailService.js';
import { isPayrollAdmin } from '../../utils/payrollAccess.js';
import * as employeeService from '../employees/employee.service.js';
import * as payrollRepository from '../payroll/payroll.repository.js';

const EMPLOYMENT_FIELDS = ['designation', 'dateOfJoining', 'dateOfLeaving'];

const splitEmploymentData = (data = {}) => {
  const userData = { ...data };
  const employmentData = {};
  for (const field of EMPLOYMENT_FIELDS) {
    if (userData[field] !== undefined) {
      employmentData[field] = userData[field];
      delete userData[field];
    }
  }
  const compensationData = {};
  for (const field of ['monthlyGrossSalary', 'salaryEffectiveFrom', 'bankName', 'bankAccountNumber', 'ifscCode']) {
    if (userData[field] !== undefined) {
      compensationData[field] = userData[field];
      delete userData[field];
    }
  }
  return { userData, employmentData, compensationData };
};

const withEmployment = async (result, requester) => {
  const users = result.users || [];
  const userIds = users.map((user) => user._id);
  const [profileMap, compensationMap] = await Promise.all([
    employeeService.getProfileMap(userIds),
    isPayrollAdmin(requester) ? employeeService.getCompensationMap(userIds) : Promise.resolve(null),
  ]);
  const serialized = users.map((user) => employeeService.serializeUserEmployment(user, profileMap, compensationMap));
  return { ...result, users: serialized };
};

export const listUsers = async (query, options, requester) => {
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

  const result = await authRepository.findAllUsers(filter, options);
  return withEmployment(result, requester);
};

export const getUserById = async (id, requester) => {
  const user = await authRepository.findById(id);
  if (!user) {
    throw ApiError.notFound('User not found');
  }
  const result = await withEmployment({ users: [user] }, requester);
  return result.users[0];
};

export const createUser = async (userData, createdBy) => {
  if (userData.role === 'super_admin') {
    throw ApiError.forbidden('The existing Super Admin is the only Super Admin account.');
  }

  const existingUser = await authRepository.findByEmail(userData.email);
  if (existingUser) {
    throw ApiError.conflict('Email already registered');
  }

  const { userData: baseUserData, employmentData, compensationData } = splitEmploymentData(userData);
  const hasCompensation = employeeService.hasCompensationPayload(compensationData);
  if (hasCompensation) employeeService.assertCanManageCompensation(createdBy);

  const role = baseUserData.role || 'employee';
  const permissions = ROLE_PERMISSIONS[role] || [];

  const user = await authRepository.createUser({
    ...baseUserData,
    role,
    permissions,
    createdBy: createdBy?._id,
  });

  try {
    const profile = await employeeService.createProfileForUser(user, employmentData);
    if (hasCompensation) {
      if (!profile) throw ApiError.badRequest('Compensation can only be assigned to staff accounts');
      await employeeService.upsertCompensationForUser(user._id, compensationData, createdBy);
    }
  } catch (error) {
    await employeeService.deleteEmploymentForUser(user._id);
    await authRepository.deleteUserById(user._id);
    throw error;
  }

  sendWelcomeEmail(baseUserData.email, baseUserData.name);
  issueVerificationOtp(user).catch(() => {});

  const result = await withEmployment({ users: [user] }, createdBy);
  return result.users[0];
};

export const updateUser = async (id, updateData, updatedBy) => {
  const user = await authRepository.findById(id);
  if (!user) {
    throw ApiError.notFound('User not found');
  }

  if (updateData.role === 'super_admin' && user.role !== 'super_admin') {
    throw ApiError.forbidden('The existing Super Admin is the only Super Admin account.');
  }
  if (user.role === 'super_admin' && updateData.role && updateData.role !== 'super_admin') {
    throw ApiError.forbidden('The existing Super Admin role cannot be changed.');
  }

  const { userData, employmentData, compensationData } = splitEmploymentData(updateData);
  const hasCompensation = employeeService.hasCompensationPayload(compensationData);
  if (hasCompensation) employeeService.assertCanManageCompensation(updatedBy);

  const targetRole = userData.role || user.role;
  if (!employeeService.isEmployeeRole(targetRole) && (Object.keys(employmentData).length || hasCompensation)) {
    throw ApiError.badRequest('Employment and compensation fields only apply to staff accounts');
  }

  if (userData.role && userData.role !== user.role) {
    userData.permissions = ROLE_PERMISSIONS[userData.role] || [];
  }
  userData.updatedBy = updatedBy?._id;

  const updated = await authRepository.updateUser(id, userData);

  if (employeeService.isEmployeeRole(updated.role)) {
    const profile = await employeeService.ensureProfileForUser(updated);
    if (Object.keys(employmentData).length) {
      await employeeService.updateProfileForUser(updated._id, employmentData);
    }
    if (hasCompensation) {
      if (!profile) throw ApiError.badRequest('Compensation can only be assigned to staff accounts');
      await employeeService.upsertCompensationForUser(updated._id, compensationData, updatedBy);
    }
  }

  const result = await withEmployment({ users: [updated] }, updatedBy);
  return result.users[0];
};

export const deleteUser = async (id) => {
  const user = await authRepository.findById(id);
  if (!user) {
    throw ApiError.notFound('User not found');
  }

  if (user.role === 'super_admin') {
    throw ApiError.badRequest('Cannot delete super admin');
  }

  if (await payrollRepository.existsSlipForEmployee(id)) {
    throw ApiError.conflict('This user has payroll history. Deactivate the account instead of deleting it.');
  }

  await employeeService.deleteEmploymentForUser(id);
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
  const updated = await authRepository.updateUser(id, { role, permissions });
  if (updated && employeeService.isEmployeeRole(updated.role)) {
    await employeeService.ensureProfileForUser(updated);
  }
  return updated;
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

export const getPortalStaff = async () => {
  const { ROLES } = await import('../../constants/index.js');
  const { default: User } = await import('../auth/auth.model.js');
  const users = await User.find({
    role: { $in: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER, ROLES.EMPLOYEE] },
    isActive: true,
  })
    .select('_id name email avatar role')
    .sort({ name: 1 })
    .lean();
  return users;
};

import ApiError from '../../utils/ApiError.js';
import { ROLES } from '../../constants/index.js';
import { isPayrollAdmin } from '../../utils/payrollAccess.js';
import * as employeeRepository from './employee.repository.js';

export const EMPLOYEE_ID_PREFIX = 'RUD-EMP-';
const STAFF_ROLES = [ROLES.ADMIN, ROLES.MANAGER, ROLES.EMPLOYEE];
const COMPENSATION_FIELDS = [
  'monthlyGrossSalary',
  'salaryEffectiveFrom',
  'bankName',
  'bankAccountNumber',
  'ifscCode',
];

const toDate = (value) => {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    if (Number.isNaN(date.getTime())) throw ApiError.badRequest('Invalid date value');
    return date;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw ApiError.badRequest('Invalid date value');
  return date;
};

const pickDefined = (source, fields) => {
  const result = {};
  for (const field of fields) {
    if (source?.[field] !== undefined) result[field] = source[field];
  }
  return result;
};

export const isEmployeeRole = (role) => STAFF_ROLES.includes(role);

export const generateEmployeeId = async () => {
  const sequence = await employeeRepository.nextCounterValue('employeeId');
  return `${EMPLOYEE_ID_PREFIX}${String(sequence).padStart(4, '0')}`;
};

export const profilePayload = (data = {}) => {
  const payload = pickDefined(data, ['designation', 'dateOfJoining', 'dateOfLeaving']);
  if (payload.dateOfJoining !== undefined) payload.dateOfJoining = toDate(payload.dateOfJoining);
  if (payload.dateOfLeaving !== undefined) payload.dateOfLeaving = toDate(payload.dateOfLeaving);
  if (payload.designation !== undefined) payload.designation = String(payload.designation || '').trim() || null;
  return payload;
};

export const compensationPayload = (data = {}) => {
  const payload = pickDefined(data, COMPENSATION_FIELDS);
  if (payload.monthlyGrossSalary !== undefined) {
    const value = Number(payload.monthlyGrossSalary);
    if (!Number.isFinite(value) || value < 0) {
      throw ApiError.badRequest('Monthly gross salary must be a valid non-negative number');
    }
    payload.monthlyGrossSalary = Math.round(value * 100) / 100;
  }
  if (payload.salaryEffectiveFrom !== undefined) {
    payload.salaryEffectiveFrom = toDate(payload.salaryEffectiveFrom);
  }
  if (payload.bankName !== undefined) payload.bankName = String(payload.bankName || '').trim() || null;
  if (payload.bankAccountNumber !== undefined) {
    payload.bankAccountNumber = String(payload.bankAccountNumber || '').replace(/\s+/g, '');
  }
  if (payload.ifscCode !== undefined) {
    payload.ifscCode = String(payload.ifscCode || '').trim().toUpperCase() || null;
  }
  return payload;
};

export const hasCompensationPayload = (data = {}) =>
  COMPENSATION_FIELDS.some((field) => {
    const value = data[field];
    if (value === undefined || value === null) return false;
    if (field === 'monthlyGrossSalary') return Number(value) > 0;
    return String(value).trim() !== '';
  });

export const assertCanManageCompensation = (requester) => {
  if (!isPayrollAdmin(requester)) {
    throw ApiError.forbidden('You do not have permission to view or edit compensation');
  }
};

export const createProfileForUser = async (user, data = {}) => {
  if (!isEmployeeRole(user.role)) return null;
  const employeeId = await generateEmployeeId();
  return employeeRepository.createProfile({
    user: user._id,
    employeeId,
    ...profilePayload(data),
  });
};

export const ensureProfileForUser = async (user) => {
  if (!isEmployeeRole(user.role)) return null;
  const existing = await employeeRepository.findProfileByUser(user._id);
  if (existing) return existing;
  return createProfileForUser(user);
};

export const updateProfileForUser = async (userId, data = {}) => {
  const payload = profilePayload(data);
  if (!Object.keys(payload).length) return null;
  return employeeRepository.updateProfile(userId, payload);
};

export const getProfileForUser = async (userId) =>
  employeeRepository.findProfileByUser(userId);

export const getCompensationForUser = async (userId) =>
  employeeRepository.findCompensationByUser(userId);

export const getProfileMap = async (userIds = []) => {
  const profiles = await employeeRepository.findProfilesByUsers(userIds);
  return new Map(profiles.map((profile) => [String(profile.user), profile]));
};

export const getCompensationMap = async (userIds = []) => {
  const compensations = await employeeRepository.findCompensationsByUsers(userIds);
  return new Map(compensations.map((compensation) => [String(compensation.employee), compensation]));
};

export const serializeCompensation = (compensation) => {
  if (!compensation) return null;
  return {
    monthlyGrossSalary: compensation.monthlyGrossSalary ?? 0,
    salaryEffectiveFrom: compensation.salaryEffectiveFrom ?? null,
    bankName: compensation.bankName ?? null,
    bankAccountNumber: compensation.bankAccountNumber ?? null,
    ifscCode: compensation.ifscCode ?? null,
    updatedAt: compensation.updatedAt ?? null,
  };
};

export const serializeProfile = (profile) => {
  if (!profile) return null;
  return {
    employeeId: profile.employeeId ?? null,
    designation: profile.designation ?? null,
    dateOfJoining: profile.dateOfJoining ?? null,
    dateOfLeaving: profile.dateOfLeaving ?? null,
  };
};

export const serializeUserEmployment = (user, profileMap, compensationMap) => {
  const userObj = user.toJSON ? user.toJSON() : { ...user };
  const profile = profileMap.get(String(userObj._id));
  const compensation = compensationMap?.get(String(userObj._id));
  userObj.profile = serializeProfile(profile);
  if (compensationMap) userObj.compensation = serializeCompensation(compensation);
  return userObj;
};

export const upsertCompensationForUser = async (userId, data, requester) => {
  assertCanManageCompensation(requester);
  const payload = compensationPayload(data);
  if (!Object.keys(payload).length) {
    throw ApiError.badRequest('No compensation fields provided');
  }
  payload.updatedBy = requester?._id ?? null;
  return employeeRepository.upsertCompensation(userId, payload);
};

export const deleteEmploymentForUser = async (userId) => {
  await Promise.all([
    employeeRepository.deleteProfileByUser(userId),
    employeeRepository.deleteCompensationByUser(userId),
  ]);
};

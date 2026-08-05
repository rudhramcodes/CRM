import ApiError from '../../utils/ApiError.js';
import config from '../../config/index.js';
import { UserPreference, Setting } from './settings.model.js';
import * as authRepository from '../auth/auth.repository.js';
import { ROLE_PERMISSIONS } from '../../constants/index.js';

// ── User Notification Preferences ──

export const getNotifPrefs = async (userId) => {
  let prefs = await UserPreference.findOne({ user: userId });
  if (!prefs) prefs = { user: userId, notify: {} };
  return prefs;
};

export const updateNotifPrefs = async (userId, notify) => {
  const prefs = await UserPreference.findOneAndUpdate(
    { user: userId },
    { $set: { notify } },
    { upsert: true, new: true },
  );
  return prefs;
};

// ── Organization Settings ──

const ORG_KEYS = ['companyName', 'logo', 'address', 'timezone', 'dateFormat', 'currency', 'language'];

export const getOrgSettings = async () => {
  const settings = await Setting.find({ key: { $in: ORG_KEYS } });
  const result = {};
  for (const s of settings) result[s.key] = s.value;
  return result;
};

export const updateOrgSettings = async (data) => {
  const ops = Object.entries(data)
    .filter(([k]) => ORG_KEYS.includes(k))
    .map(([key, value]) => ({
      updateOne: {
        filter: { key },
        update: { $set: { key, value } },
        upsert: true,
      },
    }));
  if (!ops.length) throw ApiError.badRequest('No valid org settings provided');
  await Setting.bulkWrite(ops);
  return getOrgSettings();
};

export const getRolesPermissions = () => ROLE_PERMISSIONS;

export const updateRolePermissions = async (role, permissions) => {
  if (!ROLE_PERMISSIONS[role]) throw ApiError.notFound(`Role "${role}" not found`);
  await Setting.findOneAndUpdate(
    { key: `role_permissions:${role}` },
    { $set: { key: `role_permissions:${role}`, value: permissions } },
    { upsert: true, new: true },
  );
  const { users } = await authRepository.findAllUsers({ role });
  for (const user of users) {
    await authRepository.updateUser(user._id, { permissions });
  }
  return { [role]: permissions };
};

export const shouldNotify = async (userId, type, channel = 'inApp') => {
  const prefs = await UserPreference.findOne({ user: userId });
  if (!prefs) return true;
  const channels = prefs.notify?.get?.(type) || prefs.notify?.[type];
  if (!channels) return true;
  return channels[channel] !== false;
};

// ── Security Settings (password policy, login lockout) ──

const SECURITY_KEYS = [
  'passwordMinLength', 'passwordRequireUpper', 'passwordRequireLower',
  'passwordRequireNumber', 'passwordRequireSpecial',
  'loginMaxAttempts', 'loginLockoutMinutes',
];

const SECURITY_DEFAULTS = {
  passwordMinLength: 8,
  passwordRequireUpper: true,
  passwordRequireLower: true,
  passwordRequireNumber: true,
  passwordRequireSpecial: false,
  loginMaxAttempts: 5,
  loginLockoutMinutes: 15,
};

export const getSecuritySettings = async () => {
  const settings = await Setting.find({ key: { $in: SECURITY_KEYS } });
  const result = { ...SECURITY_DEFAULTS };
  for (const s of settings) result[s.key] = s.value;
  return result;
};

export const updateSecuritySettings = async (data) => {
  const ops = Object.entries(data)
    .filter(([k]) => SECURITY_KEYS.includes(k))
    .map(([key, value]) => ({
      updateOne: {
        filter: { key },
        update: { $set: { key, value } },
        upsert: true,
      },
    }));
  if (!ops.length) throw ApiError.badRequest('No valid security settings');
  await Setting.bulkWrite(ops);
  return getSecuritySettings();
};

// ── Integration Settings (Resend, Zoho Meetings, third-party keys) ──

const INTEGRATION_KEYS = [
  'resendFromEmail', 'resendFromName',
  'zohoClientId', 'zohoClientSecret',
  'zohoOrgName', 'zohoOrgId', 'zohoApiDomain', 'zohoAccountsUrl',
];

const INTEGRATION_DEFAULTS = {
  resendFromEmail: '',
  resendFromName: '',
  zohoClientId: '',
  zohoClientSecret: '',
  zohoOrgName: '',
  zohoOrgId: '',
  zohoApiDomain: '',
  zohoAccountsUrl: '',
};

export const getIntegrationSettings = async () => {
  const settings = await Setting.find({ key: { $in: INTEGRATION_KEYS } });
  const result = { ...INTEGRATION_DEFAULTS };
  for (const s of settings) result[s.key] = s.value;
  if (!result.resendFromEmail) result.resendFromEmail = config.resend.fromEmail;
  if (!result.resendFromName) result.resendFromName = config.resend.fromName;
  result.resendConfigured = !!config.resend.apiKey;

  // Env creds are the source of truth for display; DB overrides when set via UI
  if (!result.zohoClientId) result.zohoClientId = process.env.ZOHO_CLIENT_ID || '';
  if (!result.zohoClientSecret) result.zohoClientSecret = process.env.ZOHO_CLIENT_SECRET || '';
  if (!result.zohoOrgName) result.zohoOrgName = process.env.ZOHO_ORG_NAME || 'Rudhram CRM';

  result.zohoConfigured = !!(result.zohoClientId && result.zohoClientSecret);
  const hasZohoOAuth = await Setting.findOne({ key: 'zohoRefreshToken' });
  result.zohoConnected = Boolean(hasZohoOAuth?.value);
  // Mirror zohoMeetService: meeting API DC follows the token api_domain (zohoapis.in -> meeting.zoho.in)
  const domainMatch = result.zohoApiDomain?.match(/zohoapis\.([a-z.]+)/);
  result.zohoMeetingApi = domainMatch
    ? `https://meeting.zoho.${domainMatch[1]}/api/v2`
    : config.zoho.meetingApi;
  result.zohoAccountsUrl = result.zohoAccountsUrl || config.zoho.accountsUrl;
  return result;
};

export const updateIntegrationSettings = async (data) => {
  const ops = Object.entries(data)
    .filter(([k]) => INTEGRATION_KEYS.includes(k))
    .map(([key, value]) => ({
      updateOne: {
        filter: { key },
        update: { $set: { key, value } },
        upsert: true,
      },
    }));
  if (!ops.length) throw ApiError.badRequest('No valid integration settings');
  await Setting.bulkWrite(ops);
  return getIntegrationSettings();
};

export const validatePasswordAgainstPolicy = async (password) => {
  const policy = await getSecuritySettings();
  const errors = [];
  if (password.length < policy.passwordMinLength) {
    errors.push(`Password must be at least ${policy.passwordMinLength} characters`);
  }
  if (policy.passwordRequireUpper && !/[A-Z]/.test(password)) {
    errors.push('Password must contain an uppercase letter');
  }
  if (policy.passwordRequireLower && !/[a-z]/.test(password)) {
    errors.push('Password must contain a lowercase letter');
  }
  if (policy.passwordRequireNumber && !/[0-9]/.test(password)) {
    errors.push('Password must contain a number');
  }
  if (policy.passwordRequireSpecial && !/[^A-Za-z0-9]/.test(password)) {
    errors.push('Password must contain a special character');
  }
  return errors;
};

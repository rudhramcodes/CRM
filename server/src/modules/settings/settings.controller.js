import ApiResponse from '../../utils/ApiResponse.js';
import config from '../../config/index.js';
import logger from '../../utils/logger.js';
import * as settingsService from './settings.service.js';
import * as zohoMeetService from '../../services/zohoMeetService.js';

export const getNotifPrefs = async (req, res, next) => {
  try {
    const prefs = await settingsService.getNotifPrefs(req.user._id);
    ApiResponse.success(res, 200, { prefs });
  } catch (err) { next(err); }
};

export const updateNotifPrefs = async (req, res, next) => {
  try {
    const prefs = await settingsService.updateNotifPrefs(req.user._id, req.body.notify);
    ApiResponse.success(res, 200, { prefs }, 'Notification preferences updated');
  } catch (err) { next(err); }
};

export const getOrgSettings = async (req, res, next) => {
  try {
    const settings = await settingsService.getOrgSettings();
    ApiResponse.success(res, 200, { settings });
  } catch (err) { next(err); }
};

export const updateOrgSettings = async (req, res, next) => {
  try {
    const settings = await settingsService.updateOrgSettings(req.body);
    ApiResponse.success(res, 200, { settings }, 'Organization settings updated');
  } catch (err) { next(err); }
};

export const getRolesPermissions = async (req, res, next) => {
  try {
    const roles = settingsService.getRolesPermissions();
    ApiResponse.success(res, 200, { roles });
  } catch (err) { next(err); }
};

export const updateRolePermissions = async (req, res, next) => {
  try {
    const result = await settingsService.updateRolePermissions(req.body.role, req.body.permissions);
    ApiResponse.success(res, 200, { roles: result }, 'Role permissions updated');
  } catch (err) { next(err); }
};

export const getSecuritySettings = async (req, res, next) => {
  try {
    const settings = await settingsService.getSecuritySettings();
    ApiResponse.success(res, 200, { settings });
  } catch (err) { next(err); }
};

export const updateSecuritySettings = async (req, res, next) => {
  try {
    const settings = await settingsService.updateSecuritySettings(req.body);
    ApiResponse.success(res, 200, { settings }, 'Security settings updated');
  } catch (err) { next(err); }
};

export const getIntegrationSettings = async (req, res, next) => {
  try {
    const settings = await settingsService.getIntegrationSettings();
    ApiResponse.success(res, 200, { settings });
  } catch (err) { next(err); }
};

export const updateIntegrationSettings = async (req, res, next) => {
  try {
    const settings = await settingsService.updateIntegrationSettings(req.body);
    ApiResponse.success(res, 200, { settings }, 'Integration settings updated');
  } catch (err) { next(err); }
};

const getZohoCallbackUri = (req) => {
  if (config.zohoOAuth.callbackUrl) return config.zohoOAuth.callbackUrl;
  if (process.env.CLIENT_URL) return `${config.clientUrl.replace(/\/$/, '')}/api/settings/zoho/callback`;
  return `${req.protocol}://${req.get('host')}/api/settings/zoho/callback`;
};

export const getZohoAuthUrl = async (req, res, next) => {
  try {
    const url = await zohoMeetService.buildAuthUrl(getZohoCallbackUri(req));
    if (!url) throw new Error('Zoho OAuth client not configured — add Client ID and Secret first');
    ApiResponse.success(res, 200, { url });
  } catch (err) { next(err); }
};

export const zohoCallback = async (req, res) => {
  try {
    await zohoMeetService.exchangeCode(req.query.code, getZohoCallbackUri(req));
    res.redirect(`${config.clientUrl}/settings?zoho=connected`);
  } catch (err) {
    logger.error('Zoho OAuth callback failed', { error: err.message });
    res.redirect(`${config.clientUrl}/settings?zoho=error`);
  }
};

export const disconnectZoho = async (req, res, next) => {
  try {
    await zohoMeetService.disconnectOAuth();
    ApiResponse.success(res, 200, {}, 'Zoho Meetings disconnected');
  } catch (err) { next(err); }
};

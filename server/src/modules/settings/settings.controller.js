import ApiResponse from '../../utils/ApiResponse.js';
import * as settingsService from './settings.service.js';

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

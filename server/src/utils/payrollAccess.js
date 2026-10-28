import ApiError from './ApiError.js';
import { ROLES } from '../constants/index.js';

export const PAYROLL_ACCESS_EMAILS = Object.freeze(['jaimishchhowala@rudhramenterprises.com']);

const normalizedEmail = (email) => String(email || '').trim().toLowerCase();

export const isPayrollAdmin = (user) => {
  if (!user) return false;
  if (user.role === ROLES.SUPER_ADMIN) return true;
  return PAYROLL_ACCESS_EMAILS.includes(normalizedEmail(user.email));
};

export const requirePayrollAccess = (req, _res, next) => {
  if (!req.user || !isPayrollAdmin(req.user)) {
    return next(ApiError.forbidden('You do not have permission to access payroll'));
  }
  return next();
};

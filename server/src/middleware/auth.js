import jwt from 'jsonwebtoken';
import config from '../config/index.js';
import ApiError from '../utils/ApiError.js';
import User from '../modules/auth/auth.model.js';

export const verifyToken = async (req, _res, next) => {
  try {
    const token =
      req.cookies?.accessToken ||
      (req.headers.authorization?.startsWith('Bearer ')
        ? req.headers.authorization.split(' ')[1]
        : null);

    if (!token) {
      throw ApiError.unauthorized('Access token is required');
    }

    const decoded = jwt.verify(token, config.jwt.secret);
    const user = await User.findById(decoded.userId).select('-password -refreshToken');

    if (!user) {
      throw ApiError.unauthorized('User not found');
    }

    req.user = user;
    next();
  } catch (error) {
    if (error instanceof ApiError) {
      next(error);
    } else if (error.name === 'JsonWebTokenError') {
      next(ApiError.unauthorized('Invalid access token'));
    } else if (error.name === 'TokenExpiredError') {
      next(ApiError.unauthorized('Access token expired'));
    } else {
      next(error);
    }
  }
};

export const authorize = (...roles) => {
  return (req, _res, next) => {
    if (!req.user) {
      return next(ApiError.unauthorized('Authentication required'));
    }
    if (!roles.includes(req.user.role)) {
      return next(ApiError.forbidden('You do not have permission to perform this action'));
    }
    next();
  };
};

export const requirePermission = (...permissions) => {
  return (req, _res, next) => {
    if (!req.user) {
      return next(ApiError.unauthorized('Authentication required'));
    }

    const userPermissions = req.user.permissions || [];
    const hasPermission = permissions.some((p) => userPermissions.includes(p));

    // Super admin always has permission
    if (req.user.role === 'super_admin') {
      return next();
    }

    if (!hasPermission) {
      return next(ApiError.forbidden('You do not have permission to perform this action'));
    }

    next();
  };
};

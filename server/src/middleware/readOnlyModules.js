import ApiError from '../utils/ApiError.js';

export const restrictReadOnlyModule = (module) => (req, _res, next) => {
  if (
    !['GET', 'HEAD', 'OPTIONS'].includes(req.method) &&
    req.user.readOnlyModules?.includes(module)
  ) {
    return next(ApiError.forbidden(`You have read-only access to ${module}`));
  }
  next();
};

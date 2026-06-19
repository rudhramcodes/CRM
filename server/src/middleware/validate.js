import ApiError from '../utils/ApiError.js';

const validate = (schema) => {
  return (req, _res, next) => {
    try {
      const parsed = schema.parse(req.body);
      req.body = parsed;
      next();
    } catch (error) {
      if (error.errors) {
        const errors = error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        }));
        next(ApiError.badRequest('Validation failed', errors));
      } else {
        next(ApiError.badRequest('Validation failed'));
      }
    }
  };
};

export const validateQuery = (schema) => {
  return (req, _res, next) => {
    try {
      const parsed = schema.parse(req.query);
      req.query = parsed;
      next();
    } catch (error) {
      if (error.errors) {
        const errors = error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        }));
        next(ApiError.badRequest('Invalid query parameters', errors));
      } else {
        next(ApiError.badRequest('Invalid query parameters'));
      }
    }
  };
};

export default validate;

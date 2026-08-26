import logger from '../utils/logger.js';
import ApiError from '../utils/ApiError.js';

const errorHandler = (err, req, res, _next) => {
  let error = err;

  if (!(error instanceof ApiError)) {
    const statusCode =
      error.name === 'ValidationError'
        ? 400
        : error.name === 'CastError'
          ? 400
          : error.code === 11000
            ? 409
            : error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError'
              ? 401
              : 500;

    const message =
      error.name === 'ValidationError'
        ? Object.values(error.errors)
            .map((e) => e.message)
            .join(', ')
        : error.name === 'CastError'
          ? 'Invalid ID provided. This record may have been deleted.'
          : error.code === 11000
            ? (() => {
                const fields = Object.keys(error.keyValue || {});
                return `Duplicate value for field: ${fields.join(', ')}. A record with this ${fields.join(' and ')} already exists`;
              })()
            : error.name === 'JsonWebTokenError'
              ? 'Invalid token'
              : error.name === 'TokenExpiredError'
                ? 'Token expired'
                : error.message || 'Internal server error';

    error = new ApiError(statusCode, message);
  }

  if (error.statusCode === 500) {
    logger.error('Internal Server Error', {
      message: error.message,
      stack: error.stack,
      url: req.originalUrl,
      method: req.method,
    });
  }

  const response = {
    success: false,
    message: error.message,
    ...(error.errors.length > 0 && { errors: error.errors }),
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
  };

  res.status(error.statusCode).json(response);
};

export default errorHandler;

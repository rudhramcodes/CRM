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
          ? `"${error.path}" me ye value ("${error.value}") valid nahi hai. Expected: 24-character hex ID (e.g. "6628f1a2b3c4d5e6f7a8b9c0").`
          : error.code === 11000
            ? `${Object.keys(error.keyValue).join(', ')} already exists`
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

const multer = require('multer');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');

const notFound = (req, res, next) => {
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404, 'ROUTE_NOT_FOUND'));
};

const errorHandler = (error, req, res, _next) => {
  let err = error;

  if (err instanceof multer.MulterError) {
    err = new AppError(err.code === 'LIMIT_FILE_SIZE' ? 'Uploaded file is too large' : err.message, 400, 'UPLOAD_ERROR');
  } else if (err.name === 'ValidationError') {
    const details = Object.values(err.errors || {}).map((item) => ({ field: item.path, message: item.message }));
    err = new AppError('Validation failed', 400, 'VALIDATION_ERROR', details);
  } else if (err.name === 'CastError') {
    err = new AppError('Requested resource identifier is invalid', 400, 'INVALID_ID');
  } else if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || err.keyValue || {})[0] || 'field';
    err = new AppError(`${field} already exists`, 409, 'DUPLICATE_RESOURCE', { field });
  } else if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    err = new AppError('Authentication token is invalid or expired', 401, 'INVALID_TOKEN');
  }

  const statusCode = err.statusCode || 500;
  if (statusCode >= 500) {
    logger.error(err.message || 'Unhandled server error', {
      requestId: req.id,
      method: req.method,
      path: req.originalUrl,
      stack: err.stack,
    });
  }

  const message = statusCode === 500 && process.env.NODE_ENV === 'production'
    ? 'An unexpected error occurred'
    : err.message;
  res.status(statusCode).json({
    success: false,
    message,
    data: null,
    pagination: null,
    meta: { requestId: req.id },
    errors: [{
      code: err.code || 'INTERNAL_ERROR',
      message,
      details: err.details,
    }],
    timestamp: new Date().toISOString(),
  });
};

module.exports = { notFound, errorHandler };

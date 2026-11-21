const crypto = require('crypto');
const env = require('../config/env');
const AppError = require('../utils/AppError');

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

const safeEqual = (left, right) => {
  if (typeof left !== 'string' || typeof right !== 'string') return false;
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
};

const csrfProtection = (req, _res, next) => {
  if (
    SAFE_METHODS.has(req.method) ||
    req.path === '/api/auth/login' ||
    req.path.startsWith('/api/assessment')
  ) {
    return next();
  }

  // Bearer-token API clients are not vulnerable to browser cookie CSRF.
  if (!req.cookies?.[env.sessionCookieName]) return next();

  const cookieToken = req.cookies[env.csrfCookieName];
  const headerToken = req.get('x-csrf-token');
  if (!safeEqual(cookieToken, headerToken)) {
    return next(new AppError('CSRF validation failed', 403, 'CSRF_VALIDATION_FAILED'));
  }
  return next();
};

module.exports = csrfProtection;

const jwt = require('jsonwebtoken');
const User = require('../models/User');
const env = require('../config/env');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

const extractToken = (req) => {
  const authorization = req.get('authorization') || '';
  const [scheme, bearerToken] = authorization.split(' ');
  if (scheme === 'Bearer' && bearerToken && bearerToken.split('.').length === 3) return bearerToken;
  return req.cookies?.[env.sessionCookieName];
};

const protect = asyncHandler(async (req, _res, next) => {
  const token = extractToken(req);
  if (!token) throw new AppError('Authentication is required', 401, 'AUTH_REQUIRED');

  const decoded = jwt.verify(token, env.jwtSecret, { issuer: 'teamhub-erp', audience: 'teamhub-web' });
  const user = await User.findById(decoded.id).select('+tokenVersion');

  if (!user || user.deletedAt) {
    throw new AppError('The account associated with this session no longer exists', 401, 'ACCOUNT_NOT_FOUND');
  }
  if (!user.isActive) throw new AppError('This account has been disabled', 403, 'ACCOUNT_DISABLED');
  if ((decoded.tokenVersion || 0) !== (user.tokenVersion || 0)) {
    throw new AppError('This session is no longer valid. Please sign in again', 401, 'SESSION_REVOKED');
  }

  req.user = user;
  req.authMethod = req.cookies?.[env.sessionCookieName] === token ? 'cookie' : 'bearer';
  next();
});

const authorize = (...roles) => (req, _res, next) => {
  if (String(req.user?.role || '').trim().toLowerCase() === 'super admin') return next();
  const normalizedRoles = roles.map((role) => role.toLowerCase());
  if (!req.user || !normalizedRoles.includes(String(req.user.role).toLowerCase())) {
    return next(new AppError('You do not have permission to perform this action', 403, 'FORBIDDEN'));
  }
  return next();
};


const authorizeAccess = ({ roles = [], permissions = [] } = {}) => (req, _res, next) => {
  if (!req.user) return next(new AppError('Authentication is required', 401, 'AUTH_REQUIRED'));
  const role = String(req.user.role || '').trim().toLowerCase();
  if (role === 'super admin') return next();
  const roleAllowed = roles.map((item) => String(item).toLowerCase()).includes(role);
  const assigned = new Set(req.user.permissions || []);
  const permissionAllowed = assigned.has('*') || permissions.some((permission) => assigned.has(permission));

  const hasRouteAccess = Array.isArray(req.user.allowedRoutes) && req.user.allowedRoutes.includes('/manage-employee');
  const isEmployeeAction = permissions.some((perm) =>
    String(perm).startsWith('employees.') ||
    (req.method === 'GET' && (perm === 'roles.read' || perm === 'settings.read'))
  );

  if (!roleAllowed && !permissionAllowed && !(hasRouteAccess && isEmployeeAction)) {
    return next(new AppError('You do not have permission to perform this action', 403, 'FORBIDDEN'));
  }
  return next();
};

module.exports = { protect, authorize, authorizeAccess, extractToken };

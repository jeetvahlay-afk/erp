const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Role = require('../models/Role');
const env = require('../config/env');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const pick = require('../utils/pick');
const validators = require('../validation/validators');
const { writeAuditLog } = require('../services/auditService');
const { permissionsForRoutes, sanitizeRoutes } = require('../utils/routePermissions');
const { sendSystemEmail } = require('../services/mailService');
const logger = require('../utils/logger');

const generateToken = (user, remember = false) => jwt.sign(
  { id: user._id.toString(), tokenVersion: user.tokenVersion || 0 },
  env.jwtSecret,
  {
    expiresIn: remember ? env.jwtRememberExpiresIn : env.jwtExpiresIn,
    issuer: 'teamhub-erp',
    audience: 'teamhub-web',
  },
);

const cookieOptions = (remember = false, httpOnly = true) => ({
  httpOnly,
  secure: env.cookieSecure,
  sameSite: env.cookieSameSite,
  domain: env.cookieDomain,
  path: '/',
  ...(remember ? { maxAge: env.rememberCookieDays * 24 * 60 * 60 * 1000 } : {}),
});

const serializeAuthUser = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  employeeId: user.employeeId,
  allowedRoutes: user.allowedRoutes || [],
  permissions: user.permissions || [],
  preferences: user.preferences || {},
});

const establishBrowserSession = (res, user, remember) => {
  const token = generateToken(user, remember);
  const csrfToken = crypto.randomBytes(32).toString('base64url');
  res.cookie(env.sessionCookieName, token, cookieOptions(remember, true));
  res.cookie(env.csrfCookieName, csrfToken, cookieOptions(remember, false));
};


const registerUser = asyncHandler(async (req, res) => {
  const payload = pick(req.body, [
    'name', 'firstName', 'lastName', 'username', 'email', 'password', 'role', 'employeeId',
    'phone', 'emergencyName', 'emergencyPhone', 'currentAddress', 'permanentAddress', 'address',
    'dob', 'gender', 'bloodGroup', 'documents', 'shift', 'department', 'baseSalary', 'allowedRoutes',
    'permissions', 'designation', 'joiningDate', 'employmentType', 'company', 'profileImage', 'bio',
    'reportingManager', 'bankInformation', 'familyInformation', 'education', 'experience',
  ]);

  if (req.file?.filename) payload.profileImage = req.file.filename;
  if (typeof payload.permissions === 'string') {
    try { payload.permissions = JSON.parse(payload.permissions); } catch { payload.permissions = []; }
  }
  if (typeof payload.allowedRoutes === 'string') {
    try { payload.allowedRoutes = JSON.parse(payload.allowedRoutes); } catch { payload.allowedRoutes = []; }
  }
  if (typeof payload.bankInformation === 'string') {
    try { payload.bankInformation = JSON.parse(payload.bankInformation); } catch { payload.bankInformation = {}; }
  }
  if (typeof payload.familyInformation === 'string') {
    try { payload.familyInformation = JSON.parse(payload.familyInformation); } catch { payload.familyInformation = []; }
  }
  if (typeof payload.education === 'string') {
    try { payload.education = JSON.parse(payload.education); } catch { payload.education = []; }
  }
  if (typeof payload.experience === 'string') {
    try { payload.experience = JSON.parse(payload.experience); } catch { payload.experience = []; }
  }
  if (!Array.isArray(payload.allowedRoutes)) payload.allowedRoutes = [];
  payload.allowedRoutes = sanitizeRoutes(payload.allowedRoutes);
  payload.permissions = permissionsForRoutes(payload.allowedRoutes);
  payload.email = validators.email(payload.email);
  payload.password = validators.password(payload.password);
  payload.firstName = validators.optionalString(payload.firstName, 'firstName', { max: 60 });
  payload.lastName = validators.optionalString(payload.lastName, 'lastName', { max: 60 });
  payload.name = validators.optionalString(payload.name, 'name', { max: 120 })
    || `${payload.firstName || ''} ${payload.lastName || ''}`.trim();
  validators.ensure(payload.name, 'Employee name is required', 'name');

  payload.role = String(payload.role || 'user').trim().toLowerCase();
  if (payload.role === 'super admin' && req.user.role !== 'super admin') {
    throw new AppError('Only a super admin can create another super admin', 403, 'FORBIDDEN');
  }

  const roleDoc = await Role.findOne({ name: payload.role, isActive: true });
  if (!roleDoc && !['user', 'admin', 'super admin'].includes(payload.role)) {
    throw new AppError('Selected role does not exist or is inactive', 400, 'INVALID_ROLE');
  }
  if (roleDoc?.allowedRoutes?.length) {
    payload.allowedRoutes = sanitizeRoutes([...new Set([...roleDoc.allowedRoutes, ...payload.allowedRoutes])]);
    payload.permissions = [...new Set([...(roleDoc.permissions || []), ...permissionsForRoutes(payload.allowedRoutes)])];
  }

  if (payload.address && !payload.currentAddress) payload.currentAddress = payload.address;
  delete payload.address;
  payload.baseSalary = Number(payload.baseSalary || 0);
  validators.ensure(payload.baseSalary >= 0, 'Base salary cannot be negative', 'baseSalary');

  const user = await User.create(payload);
  await writeAuditLog(req, 'user.created', 'User', user._id, { role: user.role, email: user.email });

  res.status(201).json({
    message: 'Employee account created successfully',
    user: user.toJSON(),
  });
});

const loginUser = asyncHandler(async (req, res) => {
  const identifier = String(req.body.username || req.body.email || '').trim().toLowerCase();
  validators.ensure(identifier, 'Username or email is required', 'username');
  const password = validators.requiredString(req.body.password, 'password', { max: 128 });
  const query = identifier.includes('@')
    ? { email: identifier, deletedAt: null }
    : { $or: [{ username: identifier }, { email: identifier }], deletedAt: null };
  const user = await User.findOne(query).select('+password +tokenVersion +failedLoginAttempts +lockUntil');

  if (!user) {
    throw new AppError('Invalid username or password', 401, 'INVALID_CREDENTIALS');
  }
  if (user.isLocked()) {
    throw new AppError('Too many failed attempts. Try again in 15 minutes', 429, 'ACCOUNT_LOCKED');
  }
  if (!user.isActive) {
    throw new AppError('This account has been disabled. Contact an administrator', 403, 'ACCOUNT_DISABLED');
  }

  if (!(await user.matchPassword(password))) {
    await user.recordFailedLogin();
    throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
  }

  await user.recordSuccessfulLogin();
  const remember = req.body.remember === true;
  establishBrowserSession(res, user, remember);
  const roleDoc = await Role.findOne({ name: user.role, isActive: true }).select('allowedRoutes permissions').lean();
  const authUser = serializeAuthUser(user);
  if (roleDoc?.allowedRoutes?.length) {
    authUser.allowedRoutes = sanitizeRoutes([...new Set([...roleDoc.allowedRoutes, ...(authUser.allowedRoutes || [])])]);
    authUser.permissions = [...new Set([...(roleDoc.permissions || []), ...permissionsForRoutes(authUser.allowedRoutes)])];
  }
  res.json(authUser);
});

const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  const userJson = user.toJSON();
  const roleDoc = await Role.findOne({ name: user.role, isActive: true }).select('allowedRoutes permissions').lean();
  if (roleDoc?.allowedRoutes?.length) {
    userJson.allowedRoutes = sanitizeRoutes([...new Set([...roleDoc.allowedRoutes, ...(userJson.allowedRoutes || [])])]);
    userJson.permissions = [...new Set([...(roleDoc.permissions || []), ...permissionsForRoutes(userJson.allowedRoutes)])];
  }
  res.json(userJson);
});

const verifyCredentials = asyncHandler(async (req, res) => {
  const password = validators.requiredString(req.body.password, 'password', { max: 128 });
  const user = await User.findById(req.user._id).select('+password');
  if (!user || !(await user.matchPassword(password))) {
    throw new AppError('Invalid password', 401, 'INVALID_CREDENTIALS');
  }
  res.json({ success: true });
});

const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, { $inc: { tokenVersion: 1 } });
  await writeAuditLog(req, 'auth.logout_all', 'User', req.user._id);
  const clearOptions = { path: '/', domain: env.cookieDomain, secure: env.cookieSecure, sameSite: env.cookieSameSite };
  res.clearCookie(env.sessionCookieName, clearOptions);
  res.clearCookie(env.csrfCookieName, clearOptions);
  res.status(204).send();
});

const forgotPassword = asyncHandler(async (req, res) => {
  const email = validators.email(req.body.email);
  const user = await User.findOne({ email, deletedAt: null, isActive: true });
  if (user) {
    const token = crypto.randomBytes(32).toString('base64url');
    await User.updateOne({ _id: user._id }, { $set: { passwordResetTokenHash: crypto.createHash('sha256').update(token).digest('hex'), passwordResetExpiresAt: new Date(Date.now() + 30 * 60 * 1000) } });
    try {
      const link = new URL('/reset-password', env.appBaseUrl); link.searchParams.set('token', token);
      await sendSystemEmail({ to: user.email, subject: '[TeamHub ERP] Reset your password', text: `A password reset was requested for your TeamHub ERP account.\n\nReset your password within 30 minutes: ${link}\n\nIf you did not request this, ignore this email.` });
    } catch (error) {
      logger.error('Password reset email delivery failed', { userId: user._id, error: error.message });
    }
  }
  res.json({ message: 'If an active account matches that email, a password reset link has been sent.' });
});

const resetPassword = asyncHandler(async (req, res) => {
  const token = validators.requiredString(req.body.token, 'token', { max: 200 });
  const password = validators.password(req.body.password);
  const user = await User.findOne({ passwordResetTokenHash: crypto.createHash('sha256').update(token).digest('hex'), passwordResetExpiresAt: { $gt: new Date() }, deletedAt: null, isActive: true }).select('+passwordResetTokenHash +passwordResetExpiresAt +tokenVersion');
  if (!user) throw new AppError('This password reset link is invalid or has expired', 400, 'INVALID_RESET_TOKEN');
  user.password = password;
  user.passwordResetTokenHash = undefined;
  user.passwordResetExpiresAt = undefined;
  user.failedLoginAttempts = 0;
  user.lockUntil = undefined;
  await user.save();
  await writeAuditLog(req, 'auth.password_reset', 'User', user._id);
  res.json({ message: 'Password reset successfully. You can now sign in.' });
});

module.exports = { registerUser, loginUser, getMe, verifyCredentials, logoutUser, forgotPassword, resetPassword };

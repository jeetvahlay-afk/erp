const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const User = require('../models/User');
const env = require('../config/env');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const pick = require('../utils/pick');
const validators = require('../validation/validators');
const { permissionsForRoutes, sanitizeRoutes } = require('../utils/routePermissions');
const { writeAuditLog } = require('../services/auditService');
const { findSampleUser } = require('../utils/sampleUsers');

const ADMIN_UPDATABLE_FIELDS = [
  'email', 'username', 'emergencyName', 'emergencyPhone', 'currentAddress', 'permanentAddress',
  'dob', 'gender', 'bloodGroup', 'role', 'firstName', 'lastName', 'name', 'allowedRoutes', 'phone',
  'baseSalary', 'shift', 'department', 'documents', 'employeeId', 'permissions', 'designation',
  'joiningDate', 'employmentType', 'company', 'profileImage', 'bio', 'reportingManager',
  'bankInformation', 'familyInformation', 'education', 'experience',
];

const APPEARANCE_KEYS = new Set([
  'mode', 'primaryColor', 'secondaryColor', 'accentColor', 'successColor', 'dangerColor',
  'warningColor', 'infoColor', 'sidebarColor', 'navbarColor', 'backgroundColor', 'cardColor',
  'borderColor', 'tableHeaderColor', 'hoverColor', 'linkColor', 'iconColor', 'fontFamily',
  'fontSize', 'headingScale', 'lineHeight', 'letterSpacing', 'fontWeight', 'borderRadius',
  'density', 'sidebarWidth', 'contentWidth', 'navbarHeight', 'gapScale', 'animationSpeed',
  'shadowIntensity', 'blurIntensity', 'glassEffect',
]);

const sanitizeAppearance = (value) => {
  validators.ensure(value && typeof value === 'object' && !Array.isArray(value), 'appearance must be an object', 'appearance');
  return Object.fromEntries(Object.entries(value).filter(([key, entry]) => (
    APPEARANCE_KEYS.has(key)
    && ['string', 'number', 'boolean'].includes(typeof entry)
  )));
};

const getMyPreferences = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('preferences').lean();
  if (!user) throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  res.json(user.preferences || {});
});

const updateMyPreferences = asyncHandler(async (req, res) => {
  const current = await User.findById(req.user._id).select('preferences');
  if (!current) throw new AppError('User not found', 404, 'USER_NOT_FOUND');

  const nextPreferences = { ...(current.preferences || {}) };
  if (req.body.appearance !== undefined) {
    nextPreferences.appearance = {
      ...(nextPreferences.appearance || {}),
      ...sanitizeAppearance(req.body.appearance),
    };
  }
  if (req.body.navigation !== undefined) {
    validators.ensure(req.body.navigation && typeof req.body.navigation === 'object', 'navigation must be an object', 'navigation');
    const favorites = Array.isArray(req.body.navigation.favorites)
      ? [...new Set(req.body.navigation.favorites.map(String))].slice(0, 20)
      : (nextPreferences.navigation?.favorites || []);
    const recent = Array.isArray(req.body.navigation.recent)
      ? [...new Set(req.body.navigation.recent.map(String))].slice(0, 12)
      : (nextPreferences.navigation?.recent || []);
    nextPreferences.navigation = { favorites, recent };
  }

  current.preferences = nextPreferences;
  current.markModified('preferences');
  await current.save({ validateBeforeSave: false });
  res.json({ message: 'Preferences updated successfully', data: current.preferences });
});


const getUserAvatar = asyncHandler(async (req, res) => {
  const targetId = req.params.id;
  let user = null;
  if (mongoose.isValidObjectId(targetId)) {
    user = await User.findOne({ _id: targetId, deletedAt: null }).select('profileImage').lean();
  }
  if (!user) {
    user = await User.findOne({ employeeId: targetId, deletedAt: null }).select('profileImage').lean();
  }
  if (!user?.profileImage) {
    const sample = findSampleUser(targetId);
    if (sample?.avatar) return res.redirect(sample.avatar);
    throw new AppError('Profile image not found', 404, 'AVATAR_NOT_FOUND');
  }
  const filePath = path.resolve(__dirname, '../../uploads/avatars', path.basename(user.profileImage));
  if (!fs.existsSync(filePath)) throw new AppError('Profile image is unavailable', 404, 'AVATAR_NOT_FOUND');
  res.setHeader('Cache-Control', 'private, max-age=3600');
  res.sendFile(filePath);
});

const uploadProfileAvatar = asyncHandler(async (req, res) => {
  validators.ensure(req.file?.filename, 'Profile image is required', 'profileImage');
  const user = await User.findByIdAndUpdate(req.user._id, { $set: { profileImage: req.file.filename } }, { returnDocument: 'after' });
  res.json({ message: 'Profile photo updated', profileImage: user.profileImage });
});

const uploadMyDocument = asyncHandler(async (req, res) => {
  validators.ensure(req.file?.filename, 'Document file is required', 'document');
  const document = { name: req.file.originalname, filename: req.file.filename, size: String(req.file.size), type: req.file.mimetype, date: new Date() };
  const user = await User.findByIdAndUpdate(req.user._id, { $push: { documents: document } }, { returnDocument: 'after' });
  res.status(201).json(user.documents[user.documents.length - 1]);
});

const uploadUserDocument = asyncHandler(async (req, res) => {
  validators.objectId(req.params.id, 'user id');
  validators.ensure(req.file?.filename, 'Document file is required', 'document');
  const document = { name: req.file.originalname, filename: req.file.filename, size: String(req.file.size), type: req.file.mimetype, date: new Date() };
  const user = await User.findByIdAndUpdate(req.params.id, { $push: { documents: document } }, { returnDocument: 'after' });
  if (!user) throw new AppError('Employee not found', 404, 'USER_NOT_FOUND');
  res.status(201).json(user.documents[user.documents.length - 1]);
});

const downloadUserDocument = asyncHandler(async (req, res) => {
  validators.objectId(req.params.id, 'user id');
  const isSelf = String(req.user._id) === String(req.params.id);
  const isPrivileged = ['super admin', 'admin', 'hr'].includes(String(req.user.role).toLowerCase());
  if (!isSelf && !isPrivileged) {
    throw new AppError('You do not have permission to view this document', 403, 'FORBIDDEN');
  }

  const user = await User.findById(req.params.id).select('documents').lean();
  if (!user) throw new AppError('Employee not found', 404, 'USER_NOT_FOUND');

  const doc = user.documents?.find((d) => String(d._id) === String(req.params.docId));
  if (!doc || !doc.filename) throw new AppError('Document not found', 404, 'DOCUMENT_NOT_FOUND');

  const filePath = path.resolve(__dirname, '../../uploads/documents', path.basename(doc.filename));
  if (!fs.existsSync(filePath)) throw new AppError('Document file is unavailable on server', 404, 'FILE_NOT_FOUND');

  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(doc.name)}"`);
  res.sendFile(filePath);
});

const deleteUserDocument = asyncHandler(async (req, res) => {
  validators.objectId(req.params.id, 'user id');
  const user = await User.findById(req.params.id);
  if (!user) throw new AppError('Employee not found', 404, 'USER_NOT_FOUND');

  const doc = user.documents?.find((d) => String(d._id) === String(req.params.docId));
  if (!doc) throw new AppError('Document not found', 404, 'DOCUMENT_NOT_FOUND');

  user.documents = user.documents.filter((d) => String(d._id) !== String(req.params.docId));
  await user.save();

  const filePath = path.resolve(__dirname, '../../uploads/documents', path.basename(doc.filename));
  if (fs.existsSync(filePath)) {
    fs.unlink(filePath, () => {});
  }

  res.json({ message: 'Document deleted successfully' });
});

const getUsers = asyncHandler(async (req, res) => {
  const query = { deletedAt: null };
  if (req.query.role) query.role = String(req.query.role).toLowerCase();
  if (req.query.isActive !== undefined) query.isActive = req.query.isActive === 'true';
  if (req.query.department) query.department = req.query.department;
  if (req.query.search) query.$text = { $search: String(req.query.search).trim() };

  const sort = req.query.sort === 'oldest' ? { createdAt: 1 } : { createdAt: -1 };
  const pageRequested = req.query.page !== undefined || req.query.limit !== undefined;
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 500);

  const cursor = User.find(query).sort(sort);
  if (pageRequested) cursor.skip((page - 1) * limit).limit(limit);
  const users = await cursor.lean();

  if (!pageRequested) return res.json(users);
  const total = await User.countDocuments(query);
  return res.json({ items: users, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
});

const getUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  res.json(user);
});

const updateUserProfile = asyncHandler(async (req, res) => {
  const currentPassword = validators.requiredString(req.body.currentPassword, 'currentPassword', { max: 128 });
  const newPassword = validators.password(req.body.password || req.body.newPassword);
  const user = await User.findById(req.user._id).select('+password +tokenVersion');

  if (!user || !(await user.matchPassword(currentPassword))) {
    throw new AppError('Current password is incorrect', 401, 'INVALID_CREDENTIALS');
  }
  user.password = newPassword;
  await user.save();
  await writeAuditLog(req, 'user.password_changed', 'User', user._id);
  const clearOptions = {
    path: '/',
    domain: env.cookieDomain,
    secure: env.cookieSecure,
    sameSite: env.cookieSameSite,
  };
  res.clearCookie(env.sessionCookieName, clearOptions);
  res.clearCookie(env.csrfCookieName, clearOptions);
  res.json({ message: 'Password updated successfully. Please sign in again' });
});

const deleteUser = asyncHandler(async (req, res) => {
  validators.objectId(req.params.id, 'user id');
  const targetUser = await User.findById(req.params.id).select('+tokenVersion');
  if (!targetUser || targetUser.deletedAt) throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  if (targetUser._id.equals(req.user._id)) throw new AppError('You cannot delete your own account', 400, 'SELF_DELETE_BLOCKED');
  if (targetUser.role === 'super admin' && req.user.role !== 'super admin') {
    throw new AppError('Only a super admin can delete another super admin', 403, 'FORBIDDEN');
  }
  if (targetUser.role === 'super admin') {
    const activeSuperAdmins = await User.countDocuments({ role: 'super admin', isActive: true, deletedAt: null });
    if (activeSuperAdmins <= 1) throw new AppError('The final active super admin cannot be deleted', 409, 'LAST_SUPER_ADMIN');
  }

  targetUser.isActive = false;
  targetUser.deletedAt = new Date();
  targetUser.tokenVersion += 1;
  await targetUser.save({ validateBeforeSave: false });
  await writeAuditLog(req, 'user.deleted', 'User', targetUser._id, { email: targetUser.email });
  res.json({ message: 'User archived successfully' });
});

const updateUserStatus = asyncHandler(async (req, res) => {
  validators.objectId(req.params.id, 'user id');
  validators.ensure(typeof req.body.isActive === 'boolean', 'isActive must be a boolean', 'isActive');
  const targetUser = await User.findById(req.params.id).select('+tokenVersion');
  if (!targetUser || targetUser.deletedAt) throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  if (targetUser._id.equals(req.user._id) && !req.body.isActive) {
    throw new AppError('You cannot disable your own account', 400, 'SELF_DISABLE_BLOCKED');
  }
  if (targetUser.role === 'super admin' && req.user.role !== 'super admin') {
    throw new AppError('Only a super admin can modify another super admin', 403, 'FORBIDDEN');
  }

  targetUser.isActive = req.body.isActive;
  if (!targetUser.isActive) targetUser.tokenVersion += 1;
  await targetUser.save({ validateBeforeSave: false });
  await writeAuditLog(req, 'user.status_changed', 'User', targetUser._id, { isActive: targetUser.isActive });
  res.json({ message: 'User status updated successfully', user: targetUser.toJSON() });
});

const updateUser = asyncHandler(async (req, res) => {
  validators.objectId(req.params.id, 'user id');
  const targetUser = await User.findById(req.params.id).select('+tokenVersion');
  if (!targetUser || targetUser.deletedAt) throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  if (targetUser.role === 'super admin' && req.user.role !== 'super admin') {
    throw new AppError('Only a super admin can modify another super admin', 403, 'FORBIDDEN');
  }

  const updates = pick(req.body, ADMIN_UPDATABLE_FIELDS);
  if (updates.email) updates.email = validators.email(updates.email);
  if (updates.role) {
    updates.role = String(updates.role).trim().toLowerCase();
    if (updates.role === 'super admin' && req.user.role !== 'super admin') {
      throw new AppError('Only a super admin can assign the super admin role', 403, 'FORBIDDEN');
    }
  }
  if (updates.baseSalary !== undefined) updates.baseSalary = validators.number(updates.baseSalary, 'baseSalary', { min: 0 });
  if (updates.allowedRoutes !== undefined) {
    validators.ensure(Array.isArray(updates.allowedRoutes), 'allowedRoutes must be an array', 'allowedRoutes');
    updates.allowedRoutes = sanitizeRoutes(updates.allowedRoutes);
    updates.permissions = permissionsForRoutes(updates.allowedRoutes);
  }
  if (updates.firstName !== undefined || updates.lastName !== undefined) {
    const firstName = updates.firstName ?? targetUser.firstName ?? '';
    const lastName = updates.lastName ?? targetUser.lastName ?? '';
    updates.name = `${firstName} ${lastName}`.trim() || targetUser.name;
  }

  const changedFields = Object.keys(updates);
  Object.assign(targetUser, updates);
  await targetUser.save();
  await writeAuditLog(req, 'user.updated', 'User', targetUser._id, { fields: changedFields });
  res.json({ message: 'User updated successfully', user: targetUser.toJSON() });
});

const getUserById = asyncHandler(async (req, res) => {
  const targetId = req.params.id;
  let user = null;
  if (mongoose.isValidObjectId(targetId)) {
    user = await User.findOne({ _id: targetId, deletedAt: null }).lean();
  }
  if (!user) {
    user = await User.findOne({ employeeId: targetId, deletedAt: null }).lean();
  }
  if (!user) {
    const sample = findSampleUser(targetId);
    if (sample) return res.json(sample);
    throw new AppError('Employee not found', 404, 'USER_NOT_FOUND');
  }
  res.json(user);
});

const bulkUpdateShift = asyncHandler(async (req, res) => {
  const shiftId = validators.requiredString(req.body.shiftId, 'shiftId', { max: 120 });
  const employeeIds = Array.isArray(req.body.employeeIds) ? req.body.employeeIds : [];
  employeeIds.forEach((id) => validators.objectId(id, 'employee id'));

  await User.updateMany({ shift: shiftId, deletedAt: null }, { $set: { shift: '' } });
  if (employeeIds.length > 0) {
    await User.updateMany({ _id: { $in: employeeIds }, deletedAt: null }, { $set: { shift: shiftId } });
  }
  await writeAuditLog(req, 'shift.assignments_updated', 'User', undefined, { shiftId, employeeCount: employeeIds.length });
  res.json({ message: 'Shift assignments updated successfully', updatedCount: employeeIds.length });
});

module.exports = {
  getUsers, deleteUser, updateUserStatus, updateUser, getUserProfile, updateUserProfile,
  getUserById, getUserAvatar, uploadProfileAvatar, uploadMyDocument, bulkUpdateShift,
  getMyPreferences, updateMyPreferences, uploadUserDocument, downloadUserDocument, deleteUserDocument,
};

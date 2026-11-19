const Role = require('../models/Role');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const validators = require('../validation/validators');
const { writeAuditLog } = require('../services/auditService');
const { sanitizeRoutes, permissionsForRoutes } = require('../utils/routePermissions');

const ensureDefaultRoles = async () => {
  const defaults = [
    { name: 'super admin', description: 'Full access to all system features.', isSystem: true },
    { name: 'admin', description: 'Administrative access without super-admin account control.', isSystem: true },
    { name: 'user', description: 'Standard employee access.', isSystem: true },
  ];
  await Promise.all(defaults.map((role) => Role.updateOne(
    { name: role.name },
    { $setOnInsert: role },
    { upsert: true },
  )));
  // Records created before isActive was introduced should remain available.
  // Preserve roles that an administrator has explicitly disabled.
  await Role.updateMany({ isActive: { $exists: false } }, { $set: { isActive: true } });
};

const getRoles = asyncHandler(async (_req, res) => {
  await ensureDefaultRoles();
  const roles = await Role.find({}).sort({ isSystem: -1, name: 1 }).lean();
  res.json(roles);
});

const createRole = asyncHandler(async (req, res) => {
  const name = validators.requiredString(req.body.name, 'name', { max: 80 }).toLowerCase();
  const description = validators.requiredString(req.body.description, 'description', { max: 500 });
  const allowedRoutes = Array.isArray(req.body.allowedRoutes)
    ? sanitizeRoutes(req.body.allowedRoutes)
    : [];
  const derivedPermissions = permissionsForRoutes(allowedRoutes);
  const explicitPermissions = Array.isArray(req.body.permissions)
    ? req.body.permissions.map(String)
    : [];
  const permissions = [...new Set([...explicitPermissions, ...derivedPermissions])];
  const role = await Role.create({ name, description, permissions, allowedRoutes, isSystem: false });
  await writeAuditLog(req, 'role.created', 'Role', role._id, { name, allowedRoutesCount: allowedRoutes.length });
  res.status(201).json(role);
});

const updateRole = asyncHandler(async (req, res) => {
  validators.objectId(req.params.id, 'role id');
  const role = await Role.findById(req.params.id);
  if (!role) throw new AppError('Role not found', 404, 'ROLE_NOT_FOUND');
  if (role.isSystem) throw new AppError('System roles cannot be edited', 400, 'SYSTEM_ROLE');

  const previousName = role.name;
  if (req.body.name) role.name = validators.requiredString(req.body.name, 'name', { max: 80 }).toLowerCase();
  if (req.body.description !== undefined) role.description = validators.requiredString(req.body.description, 'description', { max: 500 });
  if (req.body.allowedRoutes !== undefined) {
    role.allowedRoutes = Array.isArray(req.body.allowedRoutes)
      ? sanitizeRoutes(req.body.allowedRoutes)
      : [];
    const derived = permissionsForRoutes(role.allowedRoutes);
    const existingExplicit = Array.isArray(req.body.permissions)
      ? req.body.permissions.map(String)
      : (role.permissions || []).filter((p) => !p.startsWith('/'));
    role.permissions = [...new Set([...existingExplicit, ...derived])];
  } else if (Array.isArray(req.body.permissions)) {
    role.permissions = [...new Set(req.body.permissions.map(String))];
  }
  if (typeof req.body.isActive === 'boolean') role.isActive = req.body.isActive;
  await role.save();

  if (role.name !== previousName) {
    await User.updateMany({ role: previousName, deletedAt: null }, { $set: { role: role.name } });
  }
  await writeAuditLog(req, 'role.updated', 'Role', role._id, { previousName, name: role.name });
  res.json(role);
});

const deleteRole = asyncHandler(async (req, res) => {
  validators.objectId(req.params.id, 'role id');
  const role = await Role.findById(req.params.id);
  if (!role) throw new AppError('Role not found', 404, 'ROLE_NOT_FOUND');
  if (role.isSystem) throw new AppError('System roles cannot be deleted', 400, 'SYSTEM_ROLE');
  const assignedUsers = await User.countDocuments({ role: role.name, deletedAt: null });
  if (assignedUsers > 0) throw new AppError(`Role is assigned to ${assignedUsers} user(s)`, 409, 'ROLE_IN_USE');
  await role.deleteOne();
  await writeAuditLog(req, 'role.deleted', 'Role', role._id, { name: role.name });
  res.json({ message: 'Role removed successfully' });
});

module.exports = { getRoles, createRole, updateRole, deleteRole };

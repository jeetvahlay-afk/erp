const normalize = (value) => String(value || '').trim().toLowerCase();

export const ADMIN_ROLES = ['admin', 'super admin'];
export const HR_ROLES = ['admin', 'super admin', 'hr'];
export const RECRUITMENT_ROLES = ['admin', 'super admin', 'hr', 'recruiter'];

export const hasRole = (user, roles = []) => roles.map(normalize).includes(normalize(user?.role));

export const hasPermission = (user, permissions = [], { requireAll = false } = {}) => {
  if (normalize(user?.role) === 'super admin') return true;
  if (!permissions.length) return false;
  const assigned = new Set((user?.permissions || []).map(String));
  if (assigned.has('*')) return true;
  return requireAll
    ? permissions.every((permission) => assigned.has(permission))
    : permissions.some((permission) => assigned.has(permission));
};

export const canAccess = (user, { roles = [], permissions = [], requireAllPermissions = false } = {}) => {
  if (normalize(user?.role) === 'super admin') return true;
  if (!roles.length && !permissions.length) return true;
  return hasRole(user, roles) || hasPermission(user, permissions, { requireAll: requireAllPermissions });
};

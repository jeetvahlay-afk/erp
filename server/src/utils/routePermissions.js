const ROUTE_PERMISSIONS = Object.freeze({
  '/dashboard/admin': ['employees.read'],
  '/dashboard/hr': ['employees.read', 'attendance.read', 'leaves.read'],
  '/dashboard/payroll': ['payroll.read'],
  '/dashboard/recruitment': ['recruitment.read'],
  '/dashboard/attendance': ['attendance.read'],
  '/manage-employee': ['employees.read', 'employees.create', 'employees.write', 'employees.delete'],
  '/manage-departments': ['departments.read', 'departments.create', 'departments.write', 'departments.delete'],
  '/manage-attendance': ['attendance.read', 'attendance.write'],
  '/manage-leaves': ['leaves.read', 'leaves.write'],
  '/manage-interviews': ['recruitment.read', 'recruitment.create', 'recruitment.write'],
  '/profile-requests': ['employees.write'],
  '/payrolls': ['payroll.read', 'payroll.create', 'payroll.write'],
  '/salary-config': ['payroll.write'],
  '/manage-roles': ['roles.read', 'roles.create', 'roles.write', 'roles.delete'],
  '/manage-routes': ['settings.read', 'settings.write'],
  '/manage-shift': ['settings.read', 'settings.write'],
  '/break-config': ['settings.read', 'settings.write'],
  '/manage-breaks': ['settings.read', 'settings.write'],
  '/audit-logs': ['audit.read'],
  '/configurations': ['settings.read', 'settings.write'],
  '/mail-config': ['settings.read', 'settings.write'],
  '/accounts-config': ['settings.read', 'settings.write'],
  '/work-reports': ['employees.read'],
});

const SELF_SERVICE_ROUTES = Object.freeze([
  '/dashboard/employee', '/attendance', '/leaves', '/take-break', '/my-payroll', '/my-documents',
  '/tasks', '/tasks/assigned', '/tasks/completed', '/tasks/pending', '/tasks/today',
  '/tasks/calendar', '/tasks/kanban', '/mail/compose', '/mail/inbox', '/mail/sent',
  '/mail/drafts', '/mail/settings', '/announcements', '/birthdays', '/events',
  '/direct-chat', '/team-chat', '/my-work-report',
]);

const CONFIGURABLE_ROUTES = new Set([
  ...Object.keys(ROUTE_PERMISSIONS),
  ...SELF_SERVICE_ROUTES,
]);

const sanitizeRoutes = (routes = []) => [...new Set(
  routes.map(String).filter((route) => CONFIGURABLE_ROUTES.has(route)),
)];

const permissionsForRoutes = (routes = []) => [...new Set(
  sanitizeRoutes(routes).flatMap((route) => ROUTE_PERMISSIONS[route] || []),
)];

module.exports = {
  ROUTE_PERMISSIONS, SELF_SERVICE_ROUTES, CONFIGURABLE_ROUTES, sanitizeRoutes, permissionsForRoutes,
};

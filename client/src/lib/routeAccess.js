export const availableRoutes = Object.freeze([
  { path: '/dashboard/admin', name: 'Admin Dashboard', description: 'Business-wide HR and operations summary.' },
  { path: '/dashboard/employee', name: 'Employee Dashboard', description: 'Personal work, attendance, and leave summary.' },
  { path: '/dashboard/hr', name: 'HR Dashboard', description: 'HR operations and workforce summary.' },
  { path: '/manage-employee', name: 'Employee Directory', description: 'Employee directory and records.' },
  { path: '/manage-departments', name: 'Department Management', description: 'Department structure and headcount.' },
  { path: '/manage-attendance', name: 'Attendance Management', description: 'Attendance registers and corrections.' },
  { path: '/manage-leaves', name: 'Leave Management', description: 'Leave approvals and balances.' },
  { path: '/manage-interviews', name: 'Recruitment Management', description: 'Candidate and interview workflows.' },
  { path: '/profile-requests', name: 'Employee Profile Requests', description: 'Review employee profile change requests.' },
  { path: '/work-reports', name: 'Work Report Management', description: 'Review daily work reports from every employee.' },
  { path: '/attendance', name: 'My Attendance', description: 'Personal attendance history.' },
  { path: '/leaves', name: 'My Leave', description: 'Personal leave requests and balances.' },
  { path: '/take-break', name: 'My Breaks', description: 'Start and finish personal breaks.' },
  { path: '/my-payroll', name: 'My Payroll', description: 'Personal payroll and payslips.' },
  { path: '/my-documents', name: 'My Documents', description: 'Personal employment documents.' },
  { path: '/tasks', name: 'My Tasks', description: 'Personal and assigned task list.' },
  { path: '/my-work-report', name: 'My Work Report', description: 'Submit daily accomplishments, hours, progress, and blockers.' },
  { path: '/mail/inbox', name: 'Mailbox', description: 'Employee inbox, compose, sent mail, drafts, and settings.' },
  { path: '/announcements', name: 'Announcements', description: 'Company announcements and updates.' },
  { path: '/birthdays', name: 'Birthdays', description: 'Upcoming employee birthdays.' },
  { path: '/events', name: 'Events', description: 'Company events and important dates.' },
  { path: '/payrolls', name: 'Payroll Management', description: 'Payroll processing and payment status.' },
  { path: '/salary-config', name: 'Salary Structure', description: 'Employee salary structure configuration.' },
  { path: '/manage-roles', name: 'Roles & Permissions', description: 'Role architecture administration.' },
  { path: '/manage-routes', name: 'Route Configuration', description: 'Choose sidebar pages for each employee.' },
  { path: '/manage-shift', name: 'Shift Management', description: 'Work shift definitions and schedules.' },
  { path: '/break-config', name: 'Break Configuration', description: 'Break rules and configuration.' },
  { path: '/manage-breaks', name: 'Daily Break Schedule', description: 'Daily break allowances and schedules.' },
  { path: '/audit-logs', name: 'Audit Logs', description: 'Security and administration history.' },
  { path: '/configurations', name: 'Configuration List', description: 'System-wide operational settings.' },
  { path: '/mail-config', name: 'Mail Configuration', description: 'Outgoing email account settings.' },
  { path: '/accounts-config', name: 'Accounts Configuration', description: 'Financial account settings.' },
]);

export const availableRoutePaths = new Set(availableRoutes.map((route) => route.path));

const normalizePath = (value = '/') => {
  const path = String(value || '/').split('?')[0].split('#')[0];
  if (path.length > 1 && path.endsWith('/')) return path.slice(0, -1);
  return path;
};

const ALWAYS_AVAILABLE_ROUTES = new Set([
  '/profile',
  '/settings/appearance',
  '/unauthorized',
  '/404',
]);

const configuredRouteForPath = (pathname) => {
  const path = normalizePath(pathname);
  if (/^\/employee\/[^/]+$/.test(path) || /^\/edit-employee\/[^/]+$/.test(path) || path === '/add-employee') return '/manage-employee';
  if (/^\/admin\/attendance\/[^/]+$/.test(path)) return '/manage-attendance';
  if (path === '/attendance-register') return '/manage-attendance';
  if (/^\/interview\/[^/]+$/.test(path)) return '/manage-interviews';
  if (/^\/work-reports\/[^/]+$/.test(path)) return '/work-reports';
  if (path.startsWith('/tasks/')) return '/tasks';
  if (path.startsWith('/mail/') && path !== '/mail/inbox') return '/mail/inbox';
  return path;
};

export const isAdministrator = (user) => ['admin', 'super admin']
  .includes(String(user?.role || '').trim().toLowerCase());

export const canAccessRoute = (user, pathname) => {
  if (!user) return false;
  if (isAdministrator(user)) return true;

  const requiredRoute = configuredRouteForPath(pathname);
  if (requiredRoute === '/') return true;
  if (ALWAYS_AVAILABLE_ROUTES.has(requiredRoute)) return true;

  const assigned = new Set(Array.isArray(user.allowedRoutes) ? user.allowedRoutes : []);
  return assigned.has(requiredRoute);
};

export const firstAssignedRoute = (user) => {
  if (isAdministrator(user)) return '/dashboard/admin';
  const assigned = Array.isArray(user?.allowedRoutes) ? user.allowedRoutes : [];
  return assigned[0] || '/unauthorized';
};

import { describe, expect, it } from 'vitest';
import { canAccessRoute, firstAssignedRoute, isAdministrator } from '../routeAccess';

describe('route access', () => {
  it('keeps administrator recovery access independent of route assignments', () => {
    const admin = { role: 'Admin', allowedRoutes: [] };
    expect(isAdministrator(admin)).toBe(true);
    expect(canAccessRoute(admin, '/configurations')).toBe(true);
    expect(firstAssignedRoute(admin)).toBe('/dashboard/admin');
  });

  it('requires explicit route assignment for non-administrators', () => {
    const employee = { role: 'user', allowedRoutes: ['/attendance'] };
    expect(canAccessRoute(employee, '/attendance')).toBe(true);
    expect(canAccessRoute(employee, '/leaves')).toBe(false);
    expect(firstAssignedRoute(employee)).toBe('/attendance');
  });

  it('maps detail URLs to their assigned parent route', () => {
    const hr = { role: 'hr', allowedRoutes: ['/manage-employee', '/manage-attendance'] };
    expect(canAccessRoute(hr, '/employee/507f1f77bcf86cd799439011')).toBe(true);
    expect(canAccessRoute(hr, '/admin/attendance/507f1f77bcf86cd799439011')).toBe(true);
    expect(canAccessRoute(hr, '/interview/507f1f77bcf86cd799439011')).toBe(false);
  });

  it('uses sidebar module assignments for task and mail sub-pages', () => {
    const employee = { role: 'user', allowedRoutes: ['/tasks', '/mail/inbox'] };
    expect(canAccessRoute(employee, '/tasks/kanban')).toBe(true);
    expect(canAccessRoute(employee, '/mail/sent')).toBe(true);
  });

  it('sends an unassigned employee to the restricted page', () => {
    expect(firstAssignedRoute({ role: 'user', allowedRoutes: [] })).toBe('/unauthorized');
  });

  it('allows appearance and theme settings for all users while restricting system configurations', () => {
    const employee = { role: 'user', allowedRoutes: ['/dashboard/employee', '/attendance'] };
    expect(canAccessRoute(employee, '/settings/appearance')).toBe(true);
    expect(canAccessRoute(employee, '/configurations')).toBe(false);
    expect(canAccessRoute({ role: 'admin' }, '/configurations')).toBe(true);
  });
});

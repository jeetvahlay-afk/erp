import { describe, expect, it } from 'vitest';
import { canAccess, hasPermission } from '../access';

describe('super admin access', () => {
  const superAdmin = { role: ' Super Admin ', permissions: [], allowedRoutes: [] };

  it('bypasses explicit permission checks', () => {
    expect(hasPermission(superAdmin, ['any.permission'])).toBe(true);
  });

  it('bypasses combined role and permission checks', () => {
    expect(canAccess(superAdmin, { roles: ['hr'], permissions: ['any.permission'] })).toBe(true);
  });
});

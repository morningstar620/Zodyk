import { describe, expect, it } from 'vitest';
import { canAssignRoles } from './role-hierarchy';

describe('canAssignRoles', () => {
  it('lets a non-super-admin assign ordinary roles only', () => {
    expect(canAssignRoles(['admin'], [{ slug: 'editor', permissions: ['pages:*'] }])).toBe(true);
    expect(canAssignRoles(['admin'], [{ slug: 'super_admin', permissions: ['*'] }])).toBe(false);
    expect(canAssignRoles(['editor'], [{ slug: 'custom', permissions: ['*'] }])).toBe(false);
  });

  it('lets a super admin assign the super admin role', () => {
    expect(canAssignRoles(['super_admin'], [{ slug: 'super_admin', permissions: ['*'] }])).toBe(
      true,
    );
  });
});

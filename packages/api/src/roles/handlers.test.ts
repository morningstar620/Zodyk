import { describe, expect, it, vi } from 'vitest';

vi.mock('@zodyk/database', () => ({ connectDatabase: vi.fn(), getModels: vi.fn() }));
vi.mock('@zodyk/auth', async () => {
  const { AuthError, requirePermission } = await import('../../../auth/src/rbac/middleware');
  const { hasPermission } = await import('../../../auth/src/rbac/check');
  return { AuthError, requirePermission, hasPermission, logAuditEvent: vi.fn() };
});

import { createRole, updateRole } from './handlers';

const tokenSession = {
  userId: 'owner',
  email: 'a@example.com',
  name: 'A',
  tenantId: 'default',
  roleIds: [],
  permissions: ['roles:create', 'roles:update'],
  authMethod: 'api-token' as const,
};

describe('role delegation by API tokens', () => {
  it('rejects creating a role that grants permissions outside the token scope', async () => {
    await expect(
      createRole(tokenSession, { name: 'Admin', slug: 'admin', permissions: ['users:*'] }),
    ).rejects.toMatchObject({ status: 403 });
  });

  it('rejects adding permissions outside the token scope to an existing role', async () => {
    await expect(updateRole(tokenSession, 'role', { permissions: ['*'] })).rejects.toMatchObject({
      status: 403,
    });
  });
});

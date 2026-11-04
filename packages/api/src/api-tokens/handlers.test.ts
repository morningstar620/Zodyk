import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  find: vi.fn(),
  revoke: vi.fn(),
  generate: vi.fn(),
  audit: vi.fn(),
}));
vi.mock('@zodyk/database', () => ({
  connectDatabase: vi.fn(async () => ({})),
  getModels: () => ({ ApiToken: { findById: mocks.find } }),
}));
vi.mock('@zodyk/auth', async () => {
  const { AuthError, requireAuth, requirePermission } =
    await import('../../../auth/src/rbac/middleware');
  const { hasPermission } = await import('../../../auth/src/rbac/check');
  return {
    AuthError,
    requireAuth,
    requirePermission,
    hasPermission,
    generateApiToken: mocks.generate,
    revokeApiToken: mocks.revoke,
    logAuditEvent: mocks.audit,
  };
});

import { createApiTokenHandler, deleteApiToken } from './handlers';

const session = {
  userId: 'owner',
  email: 'a@example.com',
  name: 'A',
  tenantId: 'default',
  roleIds: [],
  permissions: ['api_tokens:create'],
};

describe('API token authorization', () => {
  beforeEach(() => {
    process.env.MONGODB_URI = 'mongodb://localhost/test';
    vi.clearAllMocks();
    mocks.find.mockResolvedValue({ userId: 'owner' });
  });

  it('allows an owner with create permission to revoke their token', async () => {
    await expect(deleteApiToken(session, 'token')).resolves.toEqual({ success: true });
    expect(mocks.revoke).toHaveBeenCalledWith('token', 'owner');
  });

  it('denies revoking another user token without delete permission', async () => {
    mocks.find.mockResolvedValue({ userId: 'other' });
    await expect(deleteApiToken(session, 'token')).rejects.toMatchObject({ status: 403 });
    expect(mocks.revoke).not.toHaveBeenCalled();
  });

  it('requires authentication and permission to revoke an owned token', async () => {
    await expect(deleteApiToken(null, 'token')).rejects.toMatchObject({ status: 401 });
    await expect(deleteApiToken({ ...session, permissions: [] }, 'token')).rejects.toMatchObject({
      status: 403,
    });
    expect(mocks.revoke).not.toHaveBeenCalled();
  });

  it('allows delete permission to revoke another user token', async () => {
    mocks.find.mockResolvedValue({ userId: 'other' });
    await deleteApiToken({ ...session, permissions: ['api_tokens:delete'] }, 'token');
    expect(mocks.revoke).toHaveBeenCalledWith('token', 'other');
  });

  it('prevents a scoped token from minting broader permissions', async () => {
    await expect(
      createApiTokenHandler(session, { name: 'new', scopes: ['users:create'] }),
    ).rejects.toMatchObject({ status: 403 });
    expect(mocks.generate).not.toHaveBeenCalled();
  });
});

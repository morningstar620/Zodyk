import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ token: vi.fn(), user: vi.fn(), roles: vi.fn(), save: vi.fn() }));
vi.mock('@zodyk/database', () => ({
  connectDatabase: vi.fn(async () => ({})),
  getModels: () => ({
    ApiToken: { findOne: mocks.token },
    User: { findById: mocks.user },
    Role: { find: mocks.roles },
  }),
}));

import { hasPermission } from '../rbac/check';
import { intersectTokenPermissions, verifyApiToken } from './api-token';

describe('API token permissions', () => {
  beforeEach(() => {
    process.env.MONGODB_URI = 'mongodb://localhost/test';
    vi.clearAllMocks();
    mocks.token.mockResolvedValue({ userId: 'u', scopes: ['media:read'], save: mocks.save });
    mocks.user.mockResolvedValue({
      _id: 'u',
      status: 'active',
      roleIds: ['role'],
      tenantId: 'default',
    });
    mocks.roles.mockResolvedValue([{ permissions: ['*'] }]);
  });

  it('restricts an admin token to its scopes', async () => {
    const session = await verifyApiToken('zodyk_live_test');
    expect(session?.authMethod).toBe('api-token');
    expect(session?.permissions).toEqual(['media:read']);
    expect(hasPermission(session!, 'users:create')).toBe(false);
    expect(hasPermission(session!, 'media:read')).toBe(true);
  });

  it('rejects a token when its owner loses the granted permission', async () => {
    mocks.roles.mockResolvedValue([{ permissions: ['users:read'] }]);
    await expect(verifyApiToken('zodyk_live_test')).resolves.toBeNull();
    expect(mocks.save).not.toHaveBeenCalled();
  });

  it('intersects wildcard patterns without widening either side', () => {
    expect(intersectTokenPermissions(['media:*'], ['media:read'])).toEqual(['media:read']);
    expect(intersectTokenPermissions(['media:read'], ['media:*'])).toEqual(['media:read']);
    expect(intersectTokenPermissions(['system_records:blog:*'], ['system_records:*'])).toEqual([
      'system_records:blog:*',
    ]);
    expect(intersectTokenPermissions(['media:*'], ['users:*'])).toEqual([]);
  });
});

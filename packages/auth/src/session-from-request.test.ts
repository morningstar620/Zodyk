import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getToken: vi.fn(),
  findById: vi.fn(),
  roleFind: vi.fn(),
}));

vi.mock('next-auth/jwt', () => ({
  getToken: mocks.getToken,
}));

vi.mock('@zodyk/database', () => ({
  connectDatabase: vi.fn(async () => ({})),
  getModels: () => ({
    User: { findById: mocks.findById },
    Role: { find: mocks.roleFind },
  }),
}));

import { resolveSessionFromHeaders } from './session-from-request';
import { refreshJwtToken } from './session-user';

function user(overrides: Record<string, unknown> = {}) {
  return {
    _id: { toString: () => 'user-1' },
    email: 'ada@example.com',
    name: 'Ada',
    status: 'active',
    tenantId: 'default',
    roleIds: [{ toString: () => 'role-viewer' }],
    deletedAt: undefined,
    ...overrides,
  };
}

describe('cookie session revalidation', () => {
  beforeEach(() => {
    process.env.AUTH_SECRET = 'test-secret';
    process.env.MONGODB_URI = 'mongodb://localhost/zodyk-test';
    process.env.AUTH_URL = 'http://localhost:5001';
    mocks.getToken.mockReset();
    mocks.findById.mockReset();
    mocks.roleFind.mockReset().mockResolvedValue([{ permissions: ['pages:read'] }]);
  });

  it('rejects a suspended or deleted user on the next API call', async () => {
    mocks.getToken.mockResolvedValue({
      userId: 'user-1',
      email: 'ada@example.com',
      roleIds: ['role-admin'],
      permissions: ['*'],
    });
    mocks.findById.mockResolvedValueOnce(user({ status: 'suspended' }));

    await expect(
      resolveSessionFromHeaders(new Headers({ cookie: 'authjs.session-token=abc' })),
    ).resolves.toBeNull();

    mocks.getToken.mockResolvedValue({ userId: 'user-1', permissions: ['*'] });
    mocks.findById.mockResolvedValueOnce(user({ deletedAt: new Date() }));
    await expect(
      resolveSessionFromHeaders(new Headers({ cookie: 'authjs.session-token=abc' })),
    ).resolves.toBeNull();
  });

  it('refreshes permissions from the database instead of the JWT', async () => {
    mocks.getToken.mockResolvedValue({
      userId: 'user-1',
      email: 'stale@example.com',
      roleIds: ['role-admin'],
      permissions: ['*'],
    });
    mocks.findById.mockResolvedValue(user());

    const session = await resolveSessionFromHeaders(
      new Headers({ cookie: 'authjs.session-token=abc' }),
    );
    expect(session).toMatchObject({
      userId: 'user-1',
      email: 'ada@example.com',
      roleIds: ['role-viewer'],
      permissions: ['pages:read'],
    });
  });

  it('clears a JWT session when the user is no longer active', async () => {
    mocks.findById.mockResolvedValue(user({ status: 'suspended' }));
    await expect(refreshJwtToken({ userId: 'user-1', permissions: ['*'] })).resolves.toBeNull();
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  userFindOne: vi.fn(),
  userFindById: vi.fn(),
  userCreate: vi.fn(),
  roleFind: vi.fn(),
  hashPassword: vi.fn(async () => 'hashed'),
  requestPasswordReset: vi.fn(async () => {}),
  logAuditEvent: vi.fn(async () => {}),
}));

vi.mock('@zodyk/database', () => ({
  connectDatabase: vi.fn(async () => ({})),
  getModels: () => ({
    User: {
      findOne: mocks.userFindOne,
      findById: mocks.userFindById,
      create: mocks.userCreate,
    },
    Role: { find: mocks.roleFind },
  }),
}));

vi.mock('@zodyk/auth', async () => {
  const { AuthError, requirePermission } = await import('../../../auth/src/rbac/middleware');
  const { canAssignRoles } = await import('../../../auth/src/rbac/role-hierarchy');
  const { hasPermission } = await import('../../../auth/src/rbac/check');
  return {
    AuthError,
    requirePermission,
    canAssignRoles,
    hasPermission,
    hashPassword: mocks.hashPassword,
    requestPasswordReset: mocks.requestPasswordReset,
    logAuditEvent: mocks.logAuditEvent,
  };
});

import { AuthError } from '@zodyk/auth';
import { adminResetPassword, createUser, updateUser } from './handlers';

const adminSession = {
  userId: 'actor-1',
  email: 'admin@example.com',
  name: 'Admin',
  tenantId: 'default',
  roleIds: ['role-admin'],
  permissions: ['users:*', 'pages:*'],
};

function lean<T>(value: T) {
  return { lean: async () => value };
}

describe('user role assignment', () => {
  beforeEach(() => {
    process.env.MONGODB_URI = 'mongodb://localhost/zodyk-test';
    mocks.userFindOne.mockReset();
    mocks.userFindById.mockReset();
    mocks.userCreate.mockReset();
    mocks.roleFind.mockReset();
    mocks.hashPassword.mockClear();
    mocks.requestPasswordReset.mockClear();
    mocks.logAuditEvent.mockClear();
  });

  it('rejects a non-super-admin assigning the super admin role', async () => {
    mocks.roleFind
      .mockReturnValueOnce(lean([{ slug: 'super_admin', permissions: ['*'] }]))
      .mockReturnValueOnce(lean([{ slug: 'admin', permissions: ['users:*'] }]));
    mocks.userFindById.mockReturnValue(lean({ roleIds: ['role-admin'] }));

    const error = await createUser(adminSession, {
      name: 'Root',
      email: 'root@example.com',
      password: 'Password1!',
      roleIds: ['role-super'],
      status: 'active',
    }).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(AuthError);
    expect((error as AuthError).status).toBe(403);
    expect(mocks.userCreate).not.toHaveBeenCalled();
  });

  it('allows an admin to assign a non-privileged role', async () => {
    mocks.roleFind
      .mockReturnValueOnce(lean([{ slug: 'editor', permissions: ['pages:*'] }]))
      .mockReturnValueOnce(lean([{ slug: 'admin', permissions: ['users:*'] }]));
    mocks.userFindById.mockReturnValue(lean({ roleIds: ['role-admin'] }));
    mocks.userFindOne.mockResolvedValue(null);
    mocks.userCreate.mockResolvedValue({
      _id: { toString: () => 'created' },
      name: 'Editor',
      email: 'editor@example.com',
      status: 'active',
      roleIds: [{ toString: () => 'role-editor' }],
    });

    const created = await createUser(adminSession, {
      name: 'Editor',
      email: 'editor@example.com',
      password: 'Password1!',
      roleIds: ['role-editor'],
      status: 'active',
    });

    expect(created.roleIds).toEqual(['role-editor']);
    expect(mocks.userCreate).toHaveBeenCalled();
  });

  it('rejects a limited API token assigning a role with broader permissions', async () => {
    mocks.roleFind.mockReturnValueOnce(
      lean([{ slug: 'admin', permissions: ['users:*', 'payments:*'] }]),
    );
    await expect(
      createUser(
        { ...adminSession, authMethod: 'api-token', permissions: ['users:create'] },
        {
          name: 'New Admin',
          email: 'new@example.com',
          password: 'Password1!',
          roleIds: ['role-admin'],
          status: 'active',
        },
      ),
    ).rejects.toMatchObject({ status: 403 });
    expect(mocks.userCreate).not.toHaveBeenCalled();
  });

  it('rejects a limited API token promoting an existing user', async () => {
    const save = vi.fn();
    mocks.userFindOne.mockResolvedValue({ email: 'user@example.com', roleIds: [], save });
    mocks.roleFind
      .mockReturnValueOnce(lean([]))
      .mockReturnValueOnce(lean([{ slug: 'admin', permissions: ['payments:*'] }]));
    await expect(
      updateUser(
        { ...adminSession, authMethod: 'api-token', permissions: ['users:update'] },
        'user-2',
        { roleIds: ['role-admin'] },
      ),
    ).rejects.toMatchObject({ status: 403 });
    expect(save).not.toHaveBeenCalled();
  });

  it('rejects a role update that grants super admin', async () => {
    const save = vi.fn();
    mocks.userFindOne.mockResolvedValue({
      email: 'user@example.com',
      name: 'User',
      status: 'active',
      roleIds: ['role-editor'],
      save,
    });
    mocks.roleFind
      .mockReturnValueOnce(lean([{ slug: 'editor', permissions: ['pages:*'] }]))
      .mockReturnValueOnce(lean([{ slug: 'super_admin', permissions: ['*'] }]))
      .mockReturnValueOnce(lean([{ slug: 'admin', permissions: ['users:*'] }]));
    mocks.userFindById.mockReturnValue(lean({ roleIds: ['role-admin'] }));

    await expect(
      updateUser(adminSession, 'user-2', { roleIds: ['role-super'] }),
    ).rejects.toMatchObject({ status: 403 });
    expect(save).not.toHaveBeenCalled();
  });

  it.each([undefined, 'api-token'] as const)(
    'rejects a %s session changing a more privileged user email',
    async (authMethod) => {
      const save = vi.fn();
      mocks.userFindOne.mockResolvedValue({ email: 'root@example.com', roleIds: ['root'], save });
      mocks.roleFind.mockReturnValueOnce(lean([{ slug: 'super_admin', permissions: ['*'] }]));
      await expect(
        updateUser({ ...adminSession, authMethod }, 'root', { email: 'other@example.com' }),
      ).rejects.toMatchObject({ status: 403 });
      expect(save).not.toHaveBeenCalled();
    },
  );

  it('rejects password reset for a user with broader permissions', async () => {
    mocks.userFindOne.mockResolvedValue({ email: 'root@example.com', roleIds: ['root'] });
    mocks.roleFind.mockReturnValueOnce(lean([{ slug: 'super_admin', permissions: ['*'] }]));
    await expect(adminResetPassword(adminSession, 'root')).rejects.toMatchObject({ status: 403 });
    expect(mocks.requestPasswordReset).not.toHaveBeenCalled();
  });
});

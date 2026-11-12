import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  userFindOne: vi.fn(),
  userFindById: vi.fn(),
  userFindOneAndUpdate: vi.fn(),
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
      findOneAndUpdate: mocks.userFindOneAndUpdate,
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
import { DEFAULT_ROLE_PERMISSIONS } from '@zodyk/core';
import { adminResetPassword, createUser, deleteUser, updateUser } from './handlers';

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
    mocks.userFindOneAndUpdate.mockReset();
    mocks.userCreate.mockReset();
    mocks.roleFind.mockReset();
    mocks.hashPassword.mockClear();
    mocks.requestPasswordReset.mockClear();
    mocks.logAuditEvent.mockClear();
  });

  it('rejects an empty role list before saving a user', async () => {
    await expect(updateUser(adminSession, 'user-2', { roleIds: [] })).rejects.toThrow(
      'At least one role is required',
    );
    expect(mocks.userFindOne).not.toHaveBeenCalled();
  });

  it('rejects suspending the current account before saving', async () => {
    await expect(
      updateUser(adminSession, 'actor-1', { status: 'suspended' }),
    ).rejects.toMatchObject({
      status: 400,
      message: 'Cannot suspend your own account',
    });
    expect(mocks.userFindOne).not.toHaveBeenCalled();
  });

  it('still allows suspending a different user', async () => {
    const save = vi.fn(async () => {});
    mocks.userFindOne.mockResolvedValue({
      _id: { toString: () => 'user-2' },
      email: 'user@example.com',
      name: 'User',
      status: 'active',
      roleIds: ['role-editor'],
      save,
    });
    mocks.roleFind.mockReturnValueOnce(lean([{ slug: 'editor', permissions: ['pages:read'] }]));
    await expect(
      updateUser(adminSession, 'user-2', { status: 'suspended' }),
    ).resolves.toMatchObject({
      status: 'suspended',
    });
    expect(save).toHaveBeenCalledOnce();
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

  it.each(['editor', 'author', 'viewer'] as const)(
    'allows Admin with the PR #59 media grant to assign the actual default %s role',
    async (role) => {
      const permissions = [...DEFAULT_ROLE_PERMISSIONS.admin, 'media:*'];
      mocks.roleFind
        .mockReturnValueOnce(lean([{ slug: role, permissions: DEFAULT_ROLE_PERMISSIONS[role] }]))
        .mockReturnValueOnce(lean([{ slug: 'admin', permissions }]));
      mocks.userFindById.mockReturnValue(lean({ roleIds: ['role-admin'] }));
      mocks.userFindOne.mockResolvedValue(null);
      mocks.userCreate.mockResolvedValue({
        _id: { toString: () => 'created' },
        name: 'User',
        email: 'user@example.com',
        status: 'active',
        roleIds: [{ toString: () => `role-${role}` }],
      });
      await expect(
        createUser(
          { ...adminSession, permissions },
          {
            name: 'User',
            email: 'user@example.com',
            password: 'Password1!',
            roleIds: [`role-${role}`],
            status: 'active',
          },
        ),
      ).resolves.toMatchObject({ roleIds: [`role-${role}`] });
    },
  );

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

  it('rejects deletion of a user with broader permissions', async () => {
    mocks.userFindOne.mockReturnValueOnce(lean({ roleIds: ['root'] }));
    mocks.roleFind.mockReturnValueOnce(lean([{ slug: 'super_admin', permissions: ['*'] }]));
    await expect(deleteUser(adminSession, 'root')).rejects.toMatchObject({ status: 403 });
    expect(mocks.userFindOneAndUpdate).not.toHaveBeenCalled();
  });

  it('allows deletion when the target permissions are covered', async () => {
    mocks.userFindOne.mockReturnValueOnce(lean({ roleIds: ['editor'] }));
    mocks.roleFind.mockReturnValueOnce(lean([{ slug: 'editor', permissions: ['pages:*'] }]));
    mocks.userFindOneAndUpdate.mockResolvedValue({ email: 'editor@example.com' });
    await expect(deleteUser(adminSession, 'editor-id')).resolves.toEqual({ success: true });
    expect(mocks.userFindOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ roleIds: ['editor'] }),
      expect.any(Object),
      { new: true },
    );
  });

  it('allows a super admin to request a reset for another super admin', async () => {
    mocks.userFindOne.mockResolvedValue({ email: 'root@example.com', roleIds: ['root'] });
    mocks.roleFind.mockReturnValueOnce(lean([{ slug: 'super_admin', permissions: ['*'] }]));
    await expect(
      adminResetPassword({ ...adminSession, permissions: ['*'] }, 'root'),
    ).resolves.toEqual({ success: true });
    expect(mocks.requestPasswordReset).toHaveBeenCalledWith('root@example.com');
  });
});

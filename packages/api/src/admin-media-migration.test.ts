import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  defaults: [] as string[],
  find: vi.fn(),
  updateOne: vi.fn(),
  connect: vi.fn(),
  disconnect: vi.fn(),
}));
vi.mock('@zodyk/core', () => ({
  DEFAULT_ROLE_PERMISSIONS: { admin: mocks.defaults },
  ROLE_SLUGS: { ADMIN: 'admin' },
}));
vi.mock('@zodyk/database', () => ({
  connectDatabase: mocks.connect,
  disconnectDatabase: mocks.disconnect,
  getModels: () => ({ Role: { find: mocks.find, updateOne: mocks.updateOne } }),
}));

import {
  hasPermissionDrift,
  migrateAdminMedia,
  type AdminPermissionPlan,
} from '../../../infrastructure/scripts/migrate-admin-media';

interface RoleDoc {
  _id: { toString(): string };
  tenantId: string;
  permissions?: string[];
  isSystem?: boolean;
}

function role(doc: Omit<RoleDoc, '_id'> & { id: string }): RoleDoc {
  return { _id: { toString: () => doc.id }, tenantId: doc.tenantId, permissions: doc.permissions };
}

function findResult(roles: RoleDoc[]) {
  return { lean: async () => roles };
}

describe('Admin media migration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.defaults.splice(0);
    mocks.defaults.push('users:*', 'media:*');
    process.env.MONGODB_URI = 'mongodb://localhost/test';
    mocks.find.mockReturnValue(findResult([role({ id: 'role-admin', tenantId: 'default' })]));
    mocks.updateOne.mockResolvedValue({ matchedCount: 1, modifiedCount: 1 });
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());

  it('refuses to run before the default role includes the media grant', async () => {
    mocks.defaults.splice(0, mocks.defaults.length, 'users:*');
    await expect(migrateAdminMedia(true)).rejects.toThrow('Integrate PR #59');
    expect(mocks.connect).not.toHaveBeenCalled();
  });

  it('previews every missing canonical permission without modifying data', async () => {
    mocks.defaults.splice(0, mocks.defaults.length, 'users:*', 'media:*', 'new:perm');
    mocks.find.mockReturnValue(
      findResult([role({ id: 'role-admin', tenantId: 'default', permissions: ['users:*'] })]),
    );

    const plan = await migrateAdminMedia();

    expect(mocks.find).toHaveBeenCalledWith({ slug: 'admin', isSystem: { $ne: false } });
    expect(plan).toEqual([
      { roleId: 'role-admin', tenantId: 'default', missing: ['media:*', 'new:perm'] },
    ]);
    expect(mocks.updateOne).not.toHaveBeenCalled();
    expect(mocks.disconnect).toHaveBeenCalledOnce();
  });

  it('adds the missing canonical permissions additively and marks the role as system', async () => {
    mocks.defaults.splice(0, mocks.defaults.length, 'users:*', 'media:*', 'new:perm');
    mocks.find.mockReturnValue(
      findResult([role({ id: 'role-admin', tenantId: 'default', permissions: ['users:*'] })]),
    );

    await migrateAdminMedia(true);

    expect(mocks.updateOne).toHaveBeenCalledWith(
      { _id: 'role-admin', isSystem: { $ne: false } },
      {
        $addToSet: { permissions: { $each: ['media:*', 'new:perm'] } },
        $set: { isSystem: true },
      },
    );
  });

  it('is a no-op when every canonical permission is already present', async () => {
    mocks.find.mockReturnValue(
      findResult([
        role({ id: 'role-admin', tenantId: 'default', permissions: ['users:*', 'media:*'] }),
      ]),
    );

    const plan = await migrateAdminMedia(true);

    expect(plan).toEqual([{ roleId: 'role-admin', tenantId: 'default', missing: [] }]);
    expect(mocks.updateOne).not.toHaveBeenCalled();
  });

  it('updates every built-in Admin role across tenants and skips custom roles', async () => {
    mocks.find.mockReturnValue(
      findResult([
        role({ id: 'role-default', tenantId: 'default', permissions: [] }),
        role({ id: 'role-acme', tenantId: 'acme', permissions: ['users:*'] }),
      ]),
    );

    const plan = await migrateAdminMedia(true);

    expect(mocks.find).toHaveBeenCalledWith({ slug: 'admin', isSystem: { $ne: false } });
    expect(plan).toEqual([
      { roleId: 'role-default', tenantId: 'default', missing: ['users:*', 'media:*'] },
      { roleId: 'role-acme', tenantId: 'acme', missing: ['media:*'] },
    ]);
    expect(mocks.updateOne).toHaveBeenCalledTimes(2);
    expect(mocks.updateOne).toHaveBeenNthCalledWith(
      1,
      { _id: 'role-default', isSystem: { $ne: false } },
      {
        $addToSet: { permissions: { $each: ['users:*', 'media:*'] } },
        $set: { isSystem: true },
      },
    );
    expect(mocks.updateOne).toHaveBeenNthCalledWith(
      2,
      { _id: 'role-acme', isSystem: { $ne: false } },
      {
        $addToSet: { permissions: { $each: ['media:*'] } },
        $set: { isSystem: true },
      },
    );
  });

  it('treats a legacy role without a permissions array as empty', async () => {
    mocks.find.mockReturnValue(
      findResult([role({ id: 'legacy-admin', tenantId: 'default', permissions: undefined })]),
    );

    const plan = await migrateAdminMedia(true);

    expect(plan[0]?.missing).toEqual(['users:*', 'media:*']);
    expect(mocks.updateOne).toHaveBeenCalledWith(
      { _id: 'legacy-admin', isSystem: { $ne: false } },
      {
        $addToSet: { permissions: { $each: ['users:*', 'media:*'] } },
        $set: { isSystem: true },
      },
    );
  });

  it('fails when no built-in Admin role exists and still disconnects', async () => {
    mocks.find.mockReturnValue(findResult([]));

    await expect(migrateAdminMedia(true)).rejects.toThrow('No built-in Admin role found');
    expect(mocks.updateOne).not.toHaveBeenCalled();
    expect(mocks.disconnect).toHaveBeenCalledOnce();
  });

  it('fails when the role changes between read and write', async () => {
    mocks.updateOne.mockResolvedValueOnce({ matchedCount: 0, modifiedCount: 0 });

    await expect(migrateAdminMedia(true)).rejects.toThrow('changed during migration');
    expect(mocks.disconnect).toHaveBeenCalledOnce();
  });

  it('disconnects if updating the role fails', async () => {
    mocks.updateOne.mockRejectedValueOnce(new Error('database error'));

    await expect(migrateAdminMedia(true)).rejects.toThrow('database error');
    expect(mocks.disconnect).toHaveBeenCalledOnce();
  });

  it('reports drift for --check only when a role is missing a permission', () => {
    const clean: AdminPermissionPlan[] = [
      { roleId: 'role-admin', tenantId: 'default', missing: [] },
    ];
    const drifted: AdminPermissionPlan[] = [
      { roleId: 'role-admin', tenantId: 'default', missing: ['media:*'] },
    ];

    expect(hasPermissionDrift(clean)).toBe(false);
    expect(hasPermissionDrift([])).toBe(false);
    expect(hasPermissionDrift(drifted)).toBe(true);
  });
});

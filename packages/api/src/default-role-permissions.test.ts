import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_ROLE_PERMISSIONS, PERMISSIONS, ROLE_SLUGS, type RoleSlug } from '@zodyk/core';
import type { AuthSession } from '@zodyk/auth';

interface MediaDoc {
  _id: { toString(): string };
  filename: string;
  originalFilename: string;
  mimeType: string;
  size: number;
  width?: number;
  height?: number;
  folder: string;
  r2Key: string;
  variants: Array<{
    format: 'webp' | 'avif';
    r2Key: string;
    width: number;
    height: number;
    size: number;
  }>;
  metadata: Record<string, unknown>;
  uploadedBy?: string;
  tenantId: string;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  save: () => Promise<MediaDoc>;
}

const harness = vi.hoisted(() => {
  const media: MediaDoc[] = [];
  let role: {
    _id: { toString(): string };
    name: string;
    slug: string;
    permissions: string[];
    isSystem: boolean;
    save: ReturnType<typeof vi.fn>;
  } | null = null;

  function chain<T>(rows: T[]) {
    const query = Promise.resolve(rows) as Promise<T[]> & {
      sort: () => typeof query;
      skip: () => typeof query;
      limit: () => typeof query;
    };
    query.sort = () => query;
    query.skip = () => query;
    query.limit = () => query;
    return query;
  }

  return {
    media,
    get role() {
      return role;
    },
    set role(value) {
      role = value;
    },
    reset() {
      media.length = 0;
      role = null;
    },
    models: {
      MediaAsset: {
        find: () => chain(media),
        findOne: async (filter: { _id?: string }) =>
          media.find((item) => item._id.toString() === filter._id) ?? null,
        countDocuments: async () => media.length,
        create: async (doc: Partial<MediaDoc>) => {
          const asset = {
            filename: 'file.bin',
            originalFilename: 'file.bin',
            mimeType: 'application/octet-stream',
            size: 0,
            folder: '/',
            r2Key: 'pending',
            variants: [],
            metadata: {},
            tenantId: 'default',
            createdAt: new Date(),
            updatedAt: new Date(),
            ...doc,
            _id: { toString: () => 'media-1' },
          } as MediaDoc;
          asset.save = async () => asset;
          media.push(asset);
          return asset;
        },
        deleteOne: async (filter: { _id?: { toString(): string } | string }) => {
          const id =
            filter._id && typeof filter._id === 'object' ? filter._id.toString() : filter._id;
          const index = media.findIndex((item) => item._id.toString() === id);
          if (index >= 0) media.splice(index, 1);
          return { deletedCount: index >= 0 ? 1 : 0 };
        },
      },
      Role: {
        findOne: async () => role,
      },
    },
  };
});

vi.mock('@zodyk/database', () => ({
  connectDatabase: async () => ({}),
  getModels: () => harness.models,
}));

vi.mock('@zodyk/media', () => ({
  getPublicUrl: async (key: string) => `https://cdn.example/${key}`,
  uploadToR2: async () => ({
    filename: 'photo.jpg',
    r2Key: 'default/media-1/photo.jpg',
    size: 4,
    width: 1,
    height: 1,
    variants: [],
  }),
  deleteFromR2: async () => undefined,
  MediaNotConfiguredError: class MediaNotConfiguredError extends Error {},
}));

vi.mock('@zodyk/auth', async () => {
  const check = await import('../../auth/src/rbac/check');
  const middleware = await import('../../auth/src/rbac/middleware');
  return {
    hasPermission: check.hasPermission,
    requireAuth: middleware.requireAuth,
    requirePermission: middleware.requirePermission,
    AuthError: middleware.AuthError,
    logAuditEvent: vi.fn(async () => undefined),
    canAssignRoles: vi.fn(() => true),
    hashPassword: vi.fn(async () => 'hashed'),
  };
});

import { hasPermission } from '@zodyk/auth';
import { deleteMediaAsset, listMedia, uploadMediaAsset } from './media/handlers';
import { updatePaymentsSettingsHandler } from './payments/handlers';
import { updateRole } from './roles/handlers';
import { updateUser } from './users/handlers';

function sessionFor(role: RoleSlug): AuthSession {
  return {
    userId: `${role}-user`,
    email: `${role}@example.com`,
    name: role,
    tenantId: 'default',
    roleIds: [role],
    permissions: DEFAULT_ROLE_PERMISSIONS[role],
  };
}

const admin = sessionFor(ROLE_SLUGS.ADMIN);
const editor = sessionFor(ROLE_SLUGS.EDITOR);

beforeEach(() => {
  process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/zodyk-test';
  harness.reset();
});

describe('default Admin media permissions', () => {
  it('lets an admin-only user list, upload, and delete media', async () => {
    expect(hasPermission(admin, PERMISSIONS.MEDIA_READ)).toBe(true);
    expect(hasPermission(admin, PERMISSIONS.MEDIA_UPLOAD)).toBe(true);
    expect(hasPermission(admin, PERMISSIONS.MEDIA_DELETE)).toBe(true);
    expect(DEFAULT_ROLE_PERMISSIONS[ROLE_SLUGS.ADMIN]).toContain('media:*');

    const listed = await listMedia(admin, {});
    expect(listed.data).toEqual([]);

    const file = new File([new Uint8Array([1, 2, 3, 4])], 'photo.jpg', { type: 'image/jpeg' });
    const form = new FormData();
    form.set('file', file);
    const uploaded = await uploadMediaAsset(admin, form);
    expect(uploaded.id).toBe('media-1');
    expect(uploaded.filename).toBe('photo.jpg');

    await expect(deleteMediaAsset(admin, uploaded.id)).resolves.toEqual({ success: true });
    expect(harness.media).toHaveLength(0);
  });

  it('still denies media library access without the admin grant', async () => {
    const stripped: AuthSession = {
      ...admin,
      permissions: admin.permissions.filter((p) => p !== 'media:*'),
    };
    await expect(listMedia(stripped, {})).rejects.toMatchObject({ status: 403 });
    await expect(uploadMediaAsset(stripped, new FormData())).rejects.toMatchObject({ status: 403 });
    await expect(deleteMediaAsset(stripped, 'media-1')).rejects.toMatchObject({ status: 403 });
  });
});

describe('Editor stays out of payments and users', () => {
  it('keeps the Editor grant unchanged', () => {
    expect(DEFAULT_ROLE_PERMISSIONS[ROLE_SLUGS.EDITOR]).toEqual([
      'pages:*',
      'menus:*',
      'media:*',
      'meta_objects:read',
      'meta_entries:*',
      'system_entities:read',
      'system_records:*',
      'themes:read',
      'themes:update',
    ]);
  });

  it('rejects payment setting changes and user updates', async () => {
    expect(hasPermission(editor, PERMISSIONS.PAYMENTS_SETTINGS)).toBe(false);
    expect(hasPermission(editor, PERMISSIONS.SETTINGS_UPDATE)).toBe(false);
    expect(hasPermission(editor, PERMISSIONS.USERS_READ)).toBe(false);
    expect(hasPermission(editor, PERMISSIONS.USERS_CREATE)).toBe(false);
    expect(hasPermission(editor, PERMISSIONS.USERS_UPDATE)).toBe(false);
    expect(hasPermission(editor, PERMISSIONS.USERS_DELETE)).toBe(false);

    await expect(updatePaymentsSettingsHandler(editor, { enabled: false })).rejects.toMatchObject({
      status: 403,
    });
    await expect(updateUser(editor, 'user-2', { name: 'Taken' })).rejects.toMatchObject({
      status: 403,
    });
  });
});

describe('system Admin role permission edits', () => {
  it('refuses a permission rewrite on the system Admin role', async () => {
    const save = vi.fn();
    harness.role = {
      _id: { toString: () => 'role-admin' },
      name: 'Admin',
      slug: ROLE_SLUGS.ADMIN,
      permissions: [...DEFAULT_ROLE_PERMISSIONS[ROLE_SLUGS.ADMIN]],
      isSystem: true,
      save,
    };

    const superAdmin = sessionFor(ROLE_SLUGS.SUPER_ADMIN);
    await expect(
      updateRole(superAdmin, 'role-admin', { permissions: ['media:read'] }),
    ).rejects.toMatchObject({
      status: 400,
      message: 'Cannot modify system role permissions',
    });
    expect(save).not.toHaveBeenCalled();
    expect(harness.role?.permissions).toContain('media:*');
  });
});

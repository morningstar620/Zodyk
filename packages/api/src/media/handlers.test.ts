import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  deleteOne: vi.fn(async () => ({})),
  findOne: vi.fn(),
  uploadToR2: vi.fn(),
  logAuditEvent: vi.fn(async () => {}),
}));

vi.mock('@zodyk/database', () => ({
  connectDatabase: vi.fn(async () => ({})),
  getModels: () => ({
    MediaAsset: {
      create: mocks.create,
      deleteOne: mocks.deleteOne,
      findOne: mocks.findOne,
    },
  }),
}));

vi.mock('@zodyk/auth', async () => {
  const { AuthError, requirePermission } = await import('../../../auth/src/rbac/middleware');
  return {
    AuthError,
    requirePermission,
    logAuditEvent: mocks.logAuditEvent,
  };
});

vi.mock('@zodyk/media', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@zodyk/media')>();
  return {
    ...actual,
    uploadToR2: mocks.uploadToR2,
    getPublicUrl: vi.fn(async (key: string) => key),
  };
});

import { AuthError } from '@zodyk/auth';
import { MediaValidationError } from '@zodyk/media';
import { uploadMediaAsset } from './handlers';

const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.alloc(8),
]);
const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
const html = Buffer.from('<html><script>alert(1)</script></html>');

const session = {
  userId: 'actor-1',
  email: 'admin@example.com',
  name: 'Admin',
  tenantId: 'default',
  roleIds: ['role-admin'],
  permissions: ['media:*'],
};

function formFor(buffer: Buffer, name: string, type: string): FormData {
  const form = new FormData();
  form.set('file', new File([Uint8Array.from(buffer)], name, { type }));
  return form;
}

function makeAsset() {
  return {
    _id: { toString: () => 'asset-1' },
    filename: 'logo.png',
    originalFilename: 'logo.png',
    mimeType: 'image/png',
    size: png.length,
    folder: '/',
    r2Key: 'pending',
    variants: [],
    metadata: {},
    uploadedBy: 'actor-1',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    save: vi.fn(async () => undefined),
  };
}

describe('uploadMediaAsset file policy', () => {
  beforeEach(() => {
    process.env.MONGODB_URI = 'mongodb://localhost/zodyk-test';
    mocks.create.mockReset();
    mocks.deleteOne.mockClear();
    mocks.uploadToR2.mockReset();
    mocks.logAuditEvent.mockClear();
  });

  it('rejects an SVG before creating a row or writing an object', async () => {
    const error = await uploadMediaAsset(
      session,
      formFor(svg, 'logo.svg', 'image/svg+xml'),
    ).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(AuthError);
    expect((error as AuthError).status).toBe(400);
    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.uploadToR2).not.toHaveBeenCalled();
  });

  it('rejects an HTML file before creating a row or writing an object', async () => {
    const error = await uploadMediaAsset(
      session,
      formFor(html, 'page.html', 'text/html'),
    ).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(AuthError);
    expect((error as AuthError).status).toBe(400);
    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.uploadToR2).not.toHaveBeenCalled();
  });

  it('rejects SVG content disguised as a PNG', async () => {
    const error = await uploadMediaAsset(
      session,
      formFor(svg, 'logo.png', 'image/png'),
    ).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(AuthError);
    expect((error as AuthError).status).toBe(400);
    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.uploadToR2).not.toHaveBeenCalled();
  });

  it('stores the detected type for a normal PNG', async () => {
    const asset = makeAsset();
    mocks.create.mockResolvedValue(asset);
    mocks.uploadToR2.mockResolvedValue({
      filename: 'logo.png',
      r2Key: 'media/asset-1/logo.png',
      size: png.length,
      width: 1,
      height: 1,
      variants: [],
    });

    const uploaded = await uploadMediaAsset(
      session,
      formFor(png, 'logo.png', 'image/png'),
    );

    expect(uploaded.mimeType).toBe('image/png');
    expect(mocks.create).toHaveBeenCalledWith(
      expect.objectContaining({ mimeType: 'image/png', size: png.length }),
    );
    expect(mocks.uploadToR2).toHaveBeenCalledWith(
      expect.objectContaining({ mimeType: 'image/png' }),
    );
  });

  it('returns 400 and removes the pending row when sharp rejects an oversized image', async () => {
    const asset = makeAsset();
    mocks.create.mockResolvedValue(asset);
    mocks.uploadToR2.mockRejectedValue(
      new MediaValidationError('Image dimensions exceed the pixel limit'),
    );

    const error = await uploadMediaAsset(
      session,
      formFor(png, 'logo.png', 'image/png'),
    ).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(AuthError);
    expect((error as AuthError).status).toBe(400);
    expect(mocks.deleteOne).toHaveBeenCalledWith({ _id: asset._id });
  });
});

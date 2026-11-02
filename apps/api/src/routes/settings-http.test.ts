import { readFileSync } from 'node:fs';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { resolve } from 'node:path';
import { clearR2ConfigCache } from '@zodyk/media/config';
import { clearPaymentsConfigCache } from '@zodyk/payments';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const { docs, platformSettings } = vi.hoisted(() => {
  process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/zodyk-settings-test';
  process.env.ENCRYPTION_KEY = 'test-encryption-key';
  process.env.AUTH_SECRET = 'test-auth-secret-for-settings-routes';
  for (const key of [
    'AUTH_URL',
    'NEXTAUTH_URL',
    'PAYMENTS_GATEWAY',
    'PAYMENTS_MODE',
    'STRIPE_SECRET_KEY',
    'STRIPE_PUBLISHABLE_KEY',
    'STRIPE_WEBHOOK_SECRET',
    'R2_ACCOUNT_ID',
    'R2_ACCESS_KEY_ID',
    'R2_SECRET_ACCESS_KEY',
    'R2_BUCKET',
    'R2_PUBLIC_URL',
    'R2_ENDPOINT',
  ]) {
    delete process.env[key];
  }

  type SettingsDoc = Record<string, unknown> & { tenantId: string };
  const docs: SettingsDoc[] = [];

  function setPath(target: Record<string, unknown>, path: string, value: unknown) {
    const parts = path.split('.');
    let cursor = target;
    for (let index = 0; index < parts.length - 1; index += 1) {
      const key = parts[index];
      if (!key) continue;
      const next = cursor[key];
      if (typeof next !== 'object' || next === null || Array.isArray(next)) {
        const child: Record<string, unknown> = {};
        cursor[key] = child;
        cursor = child;
      } else {
        cursor = next as Record<string, unknown>;
      }
    }
    const leaf = parts[parts.length - 1];
    if (leaf) cursor[leaf] = value;
  }

  function read(tenantId: string | undefined): SettingsDoc | null {
    const found = docs.find((doc) => doc.tenantId === tenantId);
    return found ? structuredClone(found) : null;
  }

  const platformSettings = {
    findOne(filter: { tenantId?: string }) {
      const promise = Promise.resolve().then(() => read(filter.tenantId));
      return Object.assign(promise, {
        lean: () => Promise.resolve().then(() => read(filter.tenantId)),
      });
    },
    async findOneAndUpdate(
      filter: { tenantId?: string },
      update: { $set?: Record<string, unknown> },
      options?: { upsert?: boolean },
    ) {
      let doc = docs.find((item) => item.tenantId === filter.tenantId);
      if (!doc) {
        if (!options?.upsert) return null;
        doc = { tenantId: filter.tenantId ?? 'default' };
        docs.push(doc);
      }
      for (const [path, value] of Object.entries(update.$set ?? {})) {
        setPath(doc, path, structuredClone(value));
      }
      return structuredClone(doc);
    },
  };

  return { docs, platformSettings };
});

vi.mock('@zodyk/auth', async () => {
  const [encryption, middleware, check] = await Promise.all([
    import('@zodyk/auth/security/encryption'),
    import('../../../../packages/auth/src/rbac/middleware'),
    import('../../../../packages/auth/src/rbac/check'),
  ]);
  return {
    encrypt: encryption.encrypt,
    decrypt: encryption.decrypt,
    hashToken: encryption.hashToken,
    AuthError: middleware.AuthError,
    requireAuth: middleware.requireAuth,
    requirePermission: middleware.requirePermission,
    hasPermission: check.hasPermission,
    hasAnyPermission: check.hasAnyPermission,
    hasAllPermissions: check.hasAllPermissions,
    logAuditEvent: async () => {},
    resolveSessionFromHeaders: async () => null,
    generateApiToken: async () => {
      throw new Error('generateApiToken is not used in settings tests');
    },
    revokeApiToken: async () => {},
    hashPassword: async () => 'hash',
  };
});

vi.mock('@zodyk/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@zodyk/api')>();
  return {
    ...actual,
    getApiSession: async () => ({
      userId: 'user-admin',
      email: 'admin@example.com',
      name: 'Admin',
      tenantId: 'default',
      roleIds: [],
      permissions: ['*'],
    }),
  };
});

vi.mock('@zodyk/database', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@zodyk/database')>();
  return {
    ...actual,
    connectDatabase: async () => actual.mongoose,
    getModels: () => {
      const models = actual.getModels();
      return {
        ...models,
        PlatformSettings: platformSettings as typeof models.PlatformSettings,
        AuditLog: { create: async () => ({}) } as typeof models.AuditLog,
      };
    },
  };
});

const MEDIA_SECRET = 'super-secret-value';
const MEDIA_ACCESS_KEY = 'AKIA1234WXYZ';
const STRIPE_SECRET = 'sk_test_4242';
const STRIPE_PUBLISHABLE = 'pk_test_1234';

let server: http.Server | undefined;
let baseUrl = '';

beforeAll(async () => {
  const { createApp } = await import('../app');
  server = http.createServer(createApp());
  await new Promise<void>((resolveListen) => {
    server?.listen(0, '127.0.0.1', resolveListen);
  });
  const address = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${address.port}`;
});

beforeEach(() => {
  docs.length = 0;
  clearR2ConfigCache();
  clearPaymentsConfigCache();
});

afterAll(async () => {
  if (!server) return;
  await new Promise<void>((resolveClose, rejectClose) => {
    server?.close((error) => (error ? rejectClose(error) : resolveClose()));
  });
});

async function request(method: string, path: string, body?: unknown) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: body === undefined ? {} : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text) as unknown;
    } catch {
      throw new Error(`${method} ${path} returned non-JSON (${response.status}): ${text}`);
    }
  }
  return { status: response.status, data, allow: response.headers.get('allow') };
}

function saveMethod(source: string, endpoint: string): string | undefined {
  const match = source.match(
    new RegExp(`fetch\\('${endpoint}',\\s*\\{[\\s\\S]*?method:\\s*'([^']+)'`),
  );
  return match?.[1];
}

describe('admin settings HTTP methods', () => {
  it('saves media and payment settings with PATCH', () => {
    const root = resolve(import.meta.dirname, '../../../..');
    const media = readFileSync(
      resolve(root, 'apps/admin/src/app/(dashboard)/settings/integrations/page.tsx'),
      'utf8',
    );
    const payments = readFileSync(
      resolve(root, 'apps/admin/src/app/(dashboard)/settings/payments/page.tsx'),
      'utf8',
    );

    expect(saveMethod(media, '/api/v1/settings/media')).toBe('PATCH');
    expect(saveMethod(payments, '/api/v1/settings/payments')).toBe('PATCH');
    expect(payments).toContain('disabled={!g.ready}');

    const routes = readFileSync(resolve(root, 'apps/api/src/routes/v1.ts'), 'utf8');
    const listSubscriptions = routes.indexOf("mount(router, 'get', '/payments/subscriptions'");
    const paymentById = routes.indexOf("mount(router, 'get', '/payments/:id'");
    expect(listSubscriptions).toBeGreaterThan(-1);
    expect(paymentById).toBeGreaterThan(listSubscriptions);
  });

  it('PATCH /settings/media persists credentials and reloads the masked config', async () => {
    const saved = await request('PATCH', '/api/v1/settings/media', {
      accountId: 'acct123',
      accessKeyId: MEDIA_ACCESS_KEY,
      secretAccessKey: MEDIA_SECRET,
      bucket: 'media-bucket',
      publicUrl: 'https://cdn.example.com',
    });

    expect(saved.status).toBe(200);
    expect(saved.data).toMatchObject({
      configured: true,
      source: 'db',
      readOnly: false,
      settings: {
        accountId: 'acct123',
        bucket: 'media-bucket',
        publicUrl: 'https://cdn.example.com',
        accessKeyIdMasked: expect.stringMatching(/WXYZ$/),
      },
    });
    expect(JSON.stringify(saved.data)).not.toContain(MEDIA_SECRET);

    const reloaded = await request('GET', '/api/v1/settings/media');
    expect(reloaded.status).toBe(200);
    expect(reloaded.data).toMatchObject({
      configured: true,
      source: 'db',
      settings: {
        accountId: 'acct123',
        bucket: 'media-bucket',
        accessKeyIdMasked: expect.stringMatching(/WXYZ$/),
      },
    });
    expect(JSON.stringify(reloaded.data)).not.toContain(MEDIA_SECRET);
    expect(JSON.stringify(docs)).not.toContain(MEDIA_SECRET);
  });

  it('PUT /settings/media returns 405 and does not persist', async () => {
    const saved = await request('PATCH', '/api/v1/settings/media', {
      accountId: 'acct123',
      accessKeyId: MEDIA_ACCESS_KEY,
      secretAccessKey: MEDIA_SECRET,
      bucket: 'media-bucket',
    });
    expect(saved.status).toBe(200);

    const rejected = await request('PUT', '/api/v1/settings/media', {
      accountId: 'acct123',
      accessKeyId: MEDIA_ACCESS_KEY,
      secretAccessKey: MEDIA_SECRET,
      bucket: 'replaced-bucket',
    });
    expect(rejected.status).toBe(405);
    expect(rejected.allow).toMatch(/PATCH/);
    expect(rejected.data).toMatchObject({
      error: 'Method Not Allowed',
      allow: ['GET', 'PATCH'],
    });

    const reloaded = await request('GET', '/api/v1/settings/media');
    expect(reloaded.data).toMatchObject({
      settings: { bucket: 'media-bucket' },
    });
  });

  it('PATCH /settings/payments persists a ready gateway and masks secrets', async () => {
    const saved = await request('PATCH', '/api/v1/settings/payments', {
      activeGateway: 'stripe',
      mode: 'test',
      gateway: 'stripe',
      credentials: {
        secretKey: STRIPE_SECRET,
        publishableKey: STRIPE_PUBLISHABLE,
      },
    });

    expect(saved.status).toBe(200);
    expect(saved.data).toMatchObject({
      readOnly: false,
      activeGateway: 'stripe',
      mode: 'test',
      credentials: {
        publishableKey: STRIPE_PUBLISHABLE,
      },
    });
    const savedCredentials = (saved.data as { credentials: Record<string, string> }).credentials;
    expect(savedCredentials.secretKey).not.toBe(STRIPE_SECRET);
    expect(savedCredentials.secretKey).toMatch(/\*+4242$/);

    const reloaded = await request('GET', '/api/v1/settings/payments');
    expect(reloaded.status).toBe(200);
    expect(reloaded.data).toMatchObject({
      activeGateway: 'stripe',
      mode: 'test',
      credentials: { publishableKey: STRIPE_PUBLISHABLE },
    });
    const reloadedCredentials = (reloaded.data as { credentials: Record<string, string> })
      .credentials;
    expect(reloadedCredentials.secretKey).toMatch(/\*+4242$/);
    expect(JSON.stringify(docs)).not.toContain(STRIPE_SECRET);
  });

  it('PATCH /settings/payments rejects a gateway that is not ready', async () => {
    for (const gateway of ['paypal', 'cashfree', 'phonepe', 'payu']) {
      const rejected = await request('PATCH', '/api/v1/settings/payments', {
        activeGateway: gateway,
        mode: 'test',
        gateway,
        credentials: { clientId: 'id', clientSecret: 'secret' },
      });
      expect(rejected.status).toBe(400);
      expect(rejected.data).toMatchObject({ code: 'GATEWAY_NOT_READY' });
    }

    const reloaded = await request('GET', '/api/v1/settings/payments');
    expect(reloaded.data).toMatchObject({ activeGateway: null });
  });

  it('PUT /settings/payments returns 405 and does not change the active gateway', async () => {
    const saved = await request('PATCH', '/api/v1/settings/payments', {
      activeGateway: 'stripe',
      mode: 'test',
      gateway: 'stripe',
      credentials: {
        secretKey: STRIPE_SECRET,
        publishableKey: STRIPE_PUBLISHABLE,
      },
    });
    expect(saved.status).toBe(200);

    const rejected = await request('PUT', '/api/v1/settings/payments', {
      activeGateway: 'razorpay',
      mode: 'live',
      gateway: 'razorpay',
      credentials: { keyId: 'rzp_test_key', keySecret: 'rzp_secret' },
    });
    expect(rejected.status).toBe(405);
    expect(rejected.data).toMatchObject({ error: 'Method Not Allowed' });

    const reloaded = await request('GET', '/api/v1/settings/payments');
    expect(reloaded.data).toMatchObject({
      activeGateway: 'stripe',
      mode: 'test',
    });
  });
});

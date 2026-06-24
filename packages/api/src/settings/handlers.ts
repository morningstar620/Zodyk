import { DEFAULT_TENANT_ID, r2SettingsSchema } from '@zodyk/core';
import { encrypt, logAuditEvent, requirePermission, AuthError, type AuthSession } from '@zodyk/auth';
import { connectDatabase, getModels } from '@zodyk/database';
import {
  clearR2ConfigCache,
  getR2Config,
  getR2ConfigSource,
  isR2Configured,
  maskAccessKeyId,
  testR2Connection,
} from '@zodyk/media';

async function ensureDb() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is required');
  await connectDatabase(uri);
  return getModels();
}

function envR2Configured(): boolean {
  return Boolean(
    process.env.R2_ACCOUNT_ID &&
      process.env.R2_ACCESS_KEY_ID &&
      process.env.R2_SECRET_ACCESS_KEY &&
      process.env.R2_BUCKET,
  );
}

export async function getMediaSettings(session: AuthSession | null) {
  requirePermission(session, 'settings:read');

  if (envR2Configured()) {
    return {
      configured: true,
      source: 'env' as const,
      readOnly: true,
      settings: {
        accountId: process.env.R2_ACCOUNT_ID!,
        accessKeyIdMasked: maskAccessKeyId(process.env.R2_ACCESS_KEY_ID!),
        bucket: process.env.R2_BUCKET!,
        publicUrl: process.env.R2_PUBLIC_URL || undefined,
        endpoint: process.env.R2_ENDPOINT || undefined,
      },
    };
  }

  const configured = await isR2Configured();
  const source = await getR2ConfigSource();

  if (!configured || source !== 'db') {
    return { configured: false, source: null, readOnly: false };
  }

  const { PlatformSettings } = await ensureDb();
  const doc = await PlatformSettings.findOne({ tenantId: DEFAULT_TENANT_ID }).lean();
  const r2 = doc?.media?.r2;

  return {
    configured: true,
    source: 'db' as const,
    readOnly: false,
    settings: r2
      ? {
          accountId: r2.accountId,
          accessKeyId: r2.accessKeyId,
          accessKeyIdMasked: maskAccessKeyId(r2.accessKeyId),
          bucket: r2.bucket,
          publicUrl: r2.publicUrl,
          endpoint: r2.endpoint,
        }
      : undefined,
  };
}

export async function updateMediaSettings(
  session: AuthSession | null,
  body: unknown,
  ip?: string,
) {
  requirePermission(session, 'settings:update');

  if (envR2Configured()) {
    return getMediaSettings(session);
  }

  const parsed = r2SettingsSchema.parse(body);
  const { PlatformSettings } = await ensureDb();

  const existing = await PlatformSettings.findOne({ tenantId: DEFAULT_TENANT_ID });
  const existingSecret = existing?.media?.r2?.secretAccessKeyEncrypted;

  const secretAccessKey = parsed.secretAccessKey;
  if (!secretAccessKey && !existingSecret) {
    throw new AuthError('Secret access key is required', 400);
  }

  if (parsed.testConnection) {
    let secretForTest = secretAccessKey;
    if (!secretForTest && existingSecret) {
      const { decrypt } = await import('@zodyk/auth/security/encryption');
      secretForTest = decrypt(existingSecret);
    }
    if (!secretForTest) {
      throw new AuthError('Secret access key is required to test connection', 400);
    }
    const result = await testR2Connection({
      accountId: parsed.accountId,
      accessKeyId: parsed.accessKeyId,
      secretAccessKey: secretForTest,
      bucket: parsed.bucket,
      endpoint: parsed.endpoint || undefined,
    });
    if (!result.ok) {
      throw new AuthError(result.error, 400);
    }
  }

  const secretEncrypted =
    secretAccessKey !== undefined ? encrypt(secretAccessKey) : existingSecret!;

  await PlatformSettings.findOneAndUpdate(
    { tenantId: DEFAULT_TENANT_ID },
    {
      $set: {
        'media.r2': {
          accountId: parsed.accountId,
          accessKeyId: parsed.accessKeyId,
          secretAccessKeyEncrypted: secretEncrypted,
          bucket: parsed.bucket,
          publicUrl: parsed.publicUrl || undefined,
          endpoint: parsed.endpoint || undefined,
        },
      },
    },
    { upsert: true, new: true },
  );

  clearR2ConfigCache();

  await logAuditEvent({
    actorId: session?.userId,
    action: 'settings.media.update',
    resource: 'settings',
    resourceId: 'media.r2',
    metadata: { accountId: parsed.accountId, bucket: parsed.bucket },
    ip,
  });

  const config = await getR2Config();
  return {
    configured: config !== null,
    source: config?.source ?? null,
    readOnly: false,
    settings: {
      accountId: parsed.accountId,
      accessKeyIdMasked: maskAccessKeyId(parsed.accessKeyId),
      bucket: parsed.bucket,
      publicUrl: parsed.publicUrl || undefined,
      endpoint: parsed.endpoint || undefined,
    },
  };
}

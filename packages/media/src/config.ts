import { decrypt } from '@zodyk/auth/security/encryption';
import { DEFAULT_TENANT_ID } from '@zodyk/core';
import { connectDatabase, getModels } from '@zodyk/database';

export class MediaNotConfiguredError extends Error {
  code = 'MEDIA_NOT_CONFIGURED';

  constructor(
    message = 'Object storage (R2) is required. Set up Cloudflare R2 in Settings or environment variables.',
  ) {
    super(message);
    this.name = 'MediaNotConfiguredError';
  }
}

export interface ResolvedR2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  publicUrl?: string;
  endpoint: string;
  source: 'env' | 'db';
}

function envConfig(): ResolvedR2Config | null {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET;

  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
    return null;
  }

  return {
    accountId,
    accessKeyId,
    secretAccessKey,
    bucket,
    publicUrl: process.env.R2_PUBLIC_URL || undefined,
    endpoint:
      process.env.R2_ENDPOINT || `https://${accountId}.r2.cloudflarestorage.com`,
    source: 'env',
  };
}

async function dbConfig(): Promise<ResolvedR2Config | null> {
  const uri = process.env.MONGODB_URI;
  if (!uri) return null;

  await connectDatabase(uri);
  const { PlatformSettings } = getModels();

  const settings = await PlatformSettings.findOne({ tenantId: DEFAULT_TENANT_ID }).lean();
  const r2 = settings?.media?.r2;
  if (!r2?.accountId || !r2.accessKeyId || !r2.secretAccessKeyEncrypted || !r2.bucket) {
    return null;
  }

  let secretAccessKey: string;
  try {
    secretAccessKey = decrypt(r2.secretAccessKeyEncrypted);
  } catch {
    return null;
  }

  return {
    accountId: r2.accountId,
    accessKeyId: r2.accessKeyId,
    secretAccessKey,
    bucket: r2.bucket,
    publicUrl: r2.publicUrl || undefined,
    endpoint:
      r2.endpoint || `https://${r2.accountId}.r2.cloudflarestorage.com`,
    source: 'db',
  };
}

let cachedConfig: ResolvedR2Config | null | undefined;

export async function getR2Config(): Promise<ResolvedR2Config | null> {
  if (cachedConfig !== undefined) {
    return cachedConfig;
  }

  const fromEnv = envConfig();
  if (fromEnv) {
    cachedConfig = fromEnv;
    return fromEnv;
  }

  const fromDb = await dbConfig();
  cachedConfig = fromDb;
  return fromDb;
}

export function clearR2ConfigCache(): void {
  cachedConfig = undefined;
}

export async function isR2Configured(): Promise<boolean> {
  const config = await getR2Config();
  return config !== null;
}

export async function requireR2Config(): Promise<ResolvedR2Config> {
  const config = await getR2Config();
  if (!config) {
    throw new MediaNotConfiguredError();
  }
  return config;
}

export async function requireR2PublicUrl(): Promise<string> {
  const config = await requireR2Config();
  if (!config.publicUrl) {
    throw new MediaNotConfiguredError(
      'R2_PUBLIC_URL is required for theme assets and media delivery.',
    );
  }
  return config.publicUrl.replace(/\/$/, '');
}

/** Full storage config required for themes and media writes. */
export async function requireStorageConfig(): Promise<ResolvedR2Config & { publicUrl: string }> {
  const config = await requireR2Config();
  if (!config.publicUrl) {
    throw new MediaNotConfiguredError(
      'R2_PUBLIC_URL is required for theme assets and media delivery.',
    );
  }
  return { ...config, publicUrl: config.publicUrl.replace(/\/$/, '') };
}

export async function isStorageFullyConfigured(): Promise<boolean> {
  const config = await getR2Config();
  return config !== null && Boolean(config.publicUrl);
}

export async function getR2ConfigSource(): Promise<'env' | 'db' | null> {
  const config = await getR2Config();
  return config?.source ?? null;
}

export function maskAccessKeyId(accessKeyId: string): string {
  if (accessKeyId.length <= 4) return '****';
  return `${'*'.repeat(Math.max(0, accessKeyId.length - 4))}${accessKeyId.slice(-4)}`;
}

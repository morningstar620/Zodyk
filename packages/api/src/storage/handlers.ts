import { AuthError, requirePermission, type AuthSession } from '@zodyk/auth';
import {
  getR2ConfigSource,
  isStorageFullyConfigured,
  requireStorageConfig,
  testR2Connection,
} from '@zodyk/media';

export async function getStorageHealthHandler(session: AuthSession | null) {
  requirePermission(session, 'media:read');

  const configured = await isStorageFullyConfigured();
  if (!configured) {
    return {
      configured: false,
      source: null,
      publicUrl: false,
      connection: false,
    };
  }

  try {
    const config = await requireStorageConfig();
    const connection = await testR2Connection({
      accountId: config.accountId,
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
      bucket: config.bucket,
      endpoint: config.endpoint,
    });
    return {
      configured: true,
      source: await getR2ConfigSource(),
      publicUrl: true,
      connection: connection.ok,
      connectionError: connection.ok ? undefined : connection.error,
    };
  } catch (error) {
    if (error instanceof AuthError) throw error;
    return {
      configured: false,
      source: await getR2ConfigSource(),
      publicUrl: false,
      connection: false,
      error: error instanceof Error ? error.message : 'Storage check failed',
    };
  }
}

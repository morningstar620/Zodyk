import {
  DEFAULT_TENANT_ID,
  localizationSettingsSchema,
  normalizeLocalizationSettings,
} from '@zodyk/core';
import { logAuditEvent, requirePermission, type AuthSession } from '@zodyk/auth';
import { connectDatabase, getModels } from '@zodyk/database';

async function ensureDb() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is required');
  await connectDatabase(uri);
  return getModels();
}

export async function getLocalizationSettings(session: AuthSession | null) {
  requirePermission(session, 'settings:read');
  const { PlatformSettings } = await ensureDb();
  const doc = await PlatformSettings.findOne({ tenantId: DEFAULT_TENANT_ID }).lean();
  return normalizeLocalizationSettings(doc?.localization);
}

export async function updateLocalizationSettings(
  session: AuthSession | null,
  body: unknown,
  ip?: string,
) {
  requirePermission(session, 'settings:update');
  const input = localizationSettingsSchema.parse(body);
  const { PlatformSettings } = await ensureDb();

  await PlatformSettings.findOneAndUpdate(
    { tenantId: DEFAULT_TENANT_ID },
    { $set: { localization: { defaultLocale: input.defaultLocale, locales: input.locales } } },
    { upsert: true, new: true },
  );

  await logAuditEvent({
    actorId: session?.userId,
    action: 'settings.localization.update',
    resource: 'settings',
    resourceId: 'localization',
    metadata: input,
    ip,
  });

  return input;
}

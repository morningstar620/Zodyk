import { DEFAULT_TENANT_ID } from '@zodyk/core';
import { AuthError, logAuditEvent, requirePermission, type AuthSession } from '@zodyk/auth';
import { connectDatabase, getModels } from '@zodyk/database';
import {
  normalizeRedirectPath,
  redirectSchema,
  robotsTxtSchema,
  sanitizeSiteUrl,
  sitemapUrlForSite,
  updateRedirectSchema,
} from '@zodyk/seo';

async function ensureDb() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is required');
  await connectDatabase(uri);
  return getModels();
}

function siteUrl(): string {
  return sanitizeSiteUrl(process.env.WEBSITE_URL ?? process.env.NEXT_PUBLIC_WEBSITE_URL);
}

function isDuplicateKey(error: unknown): boolean {
  return Boolean(
    error &&
    typeof error === 'object' &&
    'code' in error &&
    (error as { code?: number }).code === 11000,
  );
}

function storedDestination(toPath: string): string {
  const trimmed = toPath.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return normalizeRedirectPath(trimmed);
}

function serializeRedirect(item: {
  _id: { toString(): string };
  fromPath: string;
  toPath: string;
  statusCode: number;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: item._id.toString(),
    fromPath: item.fromPath,
    toPath: item.toPath,
    statusCode: item.statusCode,
    enabled: item.enabled,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

export async function getSeoSettings(session: AuthSession | null) {
  requirePermission(session, 'settings:read');
  const { PlatformSettings } = await ensureDb();
  const doc = await PlatformSettings.findOne({ tenantId: DEFAULT_TENANT_ID }).lean();
  const origin = siteUrl();
  return {
    robotsTxt: doc?.seo?.robotsTxt ?? '',
    sitemapUrl: sitemapUrlForSite(origin),
    siteUrl: origin,
  };
}

export async function updateSeoSettings(session: AuthSession | null, body: unknown, ip?: string) {
  requirePermission(session, 'settings:update');
  const input = robotsTxtSchema.parse(body);
  const { PlatformSettings } = await ensureDb();

  await PlatformSettings.findOneAndUpdate(
    { tenantId: DEFAULT_TENANT_ID },
    { $set: { 'seo.robotsTxt': input.robotsTxt } },
    { upsert: true, new: true },
  );

  await logAuditEvent({
    actorId: session?.userId,
    action: 'settings.seo.update',
    resource: 'settings',
    resourceId: 'seo.robots',
    ip,
    tenantId: DEFAULT_TENANT_ID,
  });

  return getSeoSettings(session);
}

export async function listRedirects(session: AuthSession | null) {
  requirePermission(session, 'settings:read');
  const { Redirect } = await ensureDb();
  const items = await Redirect.find({ tenantId: DEFAULT_TENANT_ID })
    .sort({ fromPath: 1 })
    .limit(500)
    .lean();
  return { data: items.map(serializeRedirect) };
}

export async function createRedirect(session: AuthSession | null, body: unknown, ip?: string) {
  requirePermission(session, 'settings:update');
  const input = redirectSchema.parse(body);
  const { Redirect } = await ensureDb();
  const fromPath = normalizeRedirectPath(input.fromPath);
  const toPath = storedDestination(input.toPath);

  if (fromPath === toPath) {
    throw new AuthError('Redirect destination must differ from the source path', 400);
  }

  try {
    const item = await Redirect.create({
      fromPath,
      toPath,
      statusCode: input.statusCode,
      enabled: input.enabled ?? true,
      tenantId: DEFAULT_TENANT_ID,
    });

    await logAuditEvent({
      actorId: session?.userId,
      action: 'redirect.create',
      resource: 'redirects',
      resourceId: item._id.toString(),
      metadata: { fromPath, toPath, statusCode: input.statusCode },
      ip,
      tenantId: DEFAULT_TENANT_ID,
    });

    return serializeRedirect(item);
  } catch (error) {
    if (isDuplicateKey(error)) {
      throw new AuthError('A redirect for that path already exists', 409);
    }
    throw error;
  }
}

export async function updateRedirect(
  session: AuthSession | null,
  id: string,
  body: unknown,
  ip?: string,
) {
  requirePermission(session, 'settings:update');
  const input = updateRedirectSchema.parse(body);
  const { Redirect } = await ensureDb();
  const item = await Redirect.findOne({ _id: id, tenantId: DEFAULT_TENANT_ID });
  if (!item) throw new AuthError('Redirect not found', 404);

  if (input.fromPath !== undefined) item.fromPath = normalizeRedirectPath(input.fromPath);
  if (input.toPath !== undefined) item.toPath = storedDestination(input.toPath);
  if (input.statusCode !== undefined) item.statusCode = input.statusCode;
  if (input.enabled !== undefined) item.enabled = input.enabled;

  if (item.fromPath === item.toPath) {
    throw new AuthError('Redirect destination must differ from the source path', 400);
  }

  try {
    await item.save();
  } catch (error) {
    if (isDuplicateKey(error)) {
      throw new AuthError('A redirect for that path already exists', 409);
    }
    throw error;
  }

  await logAuditEvent({
    actorId: session?.userId,
    action: 'redirect.update',
    resource: 'redirects',
    resourceId: id,
    ip,
    tenantId: DEFAULT_TENANT_ID,
  });

  return serializeRedirect(item);
}

export async function deleteRedirect(session: AuthSession | null, id: string, ip?: string) {
  requirePermission(session, 'settings:update');
  const { Redirect } = await ensureDb();
  const item = await Redirect.findOneAndDelete({ _id: id, tenantId: DEFAULT_TENANT_ID });
  if (!item) throw new AuthError('Redirect not found', 404);

  await logAuditEvent({
    actorId: session?.userId,
    action: 'redirect.delete',
    resource: 'redirects',
    resourceId: id,
    metadata: { fromPath: item.fromPath },
    ip,
    tenantId: DEFAULT_TENANT_ID,
  });

  return { success: true };
}

import { createApiTokenSchema, DEFAULT_TENANT_ID, paginationSchema } from '@zodyk/core';
import {
  AuthError,
  generateApiToken,
  hasPermission,
  logAuditEvent,
  requireAuth,
  requirePermission,
  revokeApiToken,
  type AuthSession,
} from '@zodyk/auth';
import { connectDatabase, getModels } from '@zodyk/database';

export async function listApiTokens(session: AuthSession | null) {
  requireAuth(session);
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is required');
  await connectDatabase(uri);
  const { ApiToken } = getModels();

  const canReadAll = hasPermission(session!, 'api_tokens:read');
  const filter = canReadAll
    ? { revokedAt: { $exists: false } }
    : { userId: session!.userId, revokedAt: { $exists: false } };

  const tokens = await ApiToken.find(filter).sort({ createdAt: -1 }).lean();
  return tokens.map((t) => ({
    id: t._id.toString(),
    name: t.name,
    prefix: t.prefix,
    scopes: t.scopes,
    lastUsedAt: t.lastUsedAt,
    expiresAt: t.expiresAt,
    createdAt: t.createdAt,
    userId: t.userId.toString(),
  }));
}

export async function createApiTokenHandler(
  session: AuthSession | null,
  body: unknown,
  ip?: string,
) {
  requirePermission(session, 'api_tokens:create');
  const input = createApiTokenSchema.parse(body);

  const token = await generateApiToken(
    session!.userId,
    input.name,
    input.scopes,
    input.expiresAt ? new Date(input.expiresAt) : undefined,
  );

  await logAuditEvent({
    actorId: session!.userId,
    action: 'api_token.create',
    resource: 'api_tokens',
    resourceId: token.id,
    metadata: { name: token.name, scopes: token.scopes },
    ip,
    tenantId: DEFAULT_TENANT_ID,
  });

  return token;
}

export async function deleteApiToken(session: AuthSession | null, id: string, ip?: string) {
  requirePermission(session, 'api_tokens:delete');
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is required');
  await connectDatabase(uri);
  const { ApiToken } = getModels();

  const token = await ApiToken.findById(id);
  if (!token || token.revokedAt) throw new AuthError('Token not found', 404);

  const canDeleteAll = hasPermission(session!, 'api_tokens:delete');
  if (!canDeleteAll && token.userId.toString() !== session!.userId) {
    throw new AuthError('Insufficient permissions', 403);
  }

  await revokeApiToken(id, token.userId.toString());

  await logAuditEvent({
    actorId: session!.userId,
    action: 'api_token.revoke',
    resource: 'api_tokens',
    resourceId: id,
    ip,
    tenantId: DEFAULT_TENANT_ID,
  });

  return { success: true };
}

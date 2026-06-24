import { DEFAULT_TENANT_ID, paginationSchema } from '@zodyk/core';
import { requirePermission, type AuthSession } from '@zodyk/auth';
import { connectDatabase, getModels } from '@zodyk/database';

export async function listAuditLogs(
  session: AuthSession | null,
  params: Record<string, string | string[] | undefined>,
) {
  requirePermission(session, 'audit:read');
  const { page, limit } = paginationSchema.parse({
    page: params.page,
    limit: params.limit,
  });

  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is required');
  await connectDatabase(uri);
  const { AuditLog, User } = getModels();

  const skip = (page - 1) * limit;
  const filter = { tenantId: DEFAULT_TENANT_ID };

  const [logs, total] = await Promise.all([
    AuditLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    AuditLog.countDocuments(filter),
  ]);

  const actorIds = [...new Set(logs.map((l) => l.actorId?.toString()).filter(Boolean))];
  const actors = await User.find({ _id: { $in: actorIds } }).lean();
  const actorMap = new Map(actors.map((a) => [a._id.toString(), a]));

  return {
    data: logs.map((l) => ({
      id: l._id.toString(),
      action: l.action,
      resource: l.resource,
      resourceId: l.resourceId,
      metadata: l.metadata,
      ip: l.ip,
      createdAt: l.createdAt,
      actor: l.actorId
        ? {
            id: l.actorId.toString(),
            name: actorMap.get(l.actorId.toString())?.name,
            email: actorMap.get(l.actorId.toString())?.email,
          }
        : null,
    })),
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  };
}

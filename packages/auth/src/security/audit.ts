import { DEFAULT_TENANT_ID } from '@zodyk/core';
import { connectDatabase, getModels } from '@zodyk/database';
import type { Types } from 'mongoose';

export interface AuditEventInput {
  actorId?: string | Types.ObjectId;
  action: string;
  resource: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  ip?: string;
  tenantId?: string;
}

export async function logAuditEvent(event: AuditEventInput): Promise<void> {
  const uri = process.env.MONGODB_URI;
  if (!uri) return;

  await connectDatabase(uri);
  const { AuditLog } = getModels();

  await AuditLog.create({
    actorId: event.actorId,
    action: event.action,
    resource: event.resource,
    resourceId: event.resourceId,
    metadata: event.metadata,
    ip: event.ip,
    tenantId: event.tenantId ?? DEFAULT_TENANT_ID,
  });
}

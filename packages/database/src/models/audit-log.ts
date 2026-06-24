import { DEFAULT_TENANT_ID } from '@zodyk/core';
import { Schema, type Document, type Model, type Types } from 'mongoose';

export interface IAuditLog extends Document {
  actorId?: Types.ObjectId;
  action: string;
  resource: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  ip?: string;
  tenantId: string;
  createdAt: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    actorId: { type: Schema.Types.ObjectId, ref: 'User' },
    action: { type: String, required: true },
    resource: { type: String, required: true },
    resourceId: { type: String },
    metadata: { type: Schema.Types.Mixed },
    ip: { type: String },
    tenantId: { type: String, required: true, default: DEFAULT_TENANT_ID },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

auditLogSchema.index({ tenantId: 1, createdAt: -1 });
auditLogSchema.index({ actorId: 1, createdAt: -1 });
auditLogSchema.index({ resource: 1, resourceId: 1 });

export type AuditLogModel = Model<IAuditLog>;

export function getAuditLogModel(mongoose: typeof import('mongoose')): AuditLogModel {
  return (
    (mongoose.models.AuditLog as AuditLogModel) ??
    mongoose.model<IAuditLog>('AuditLog', auditLogSchema)
  );
}

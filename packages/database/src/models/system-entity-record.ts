import { DEFAULT_TENANT_ID } from '@zodyk/core';
import { Schema, type Document, type Model, type Types } from 'mongoose';

export type SystemRecordStatus = 'active' | 'archived' | 'draft';

export interface ISystemEntityRecord extends Document {
  entitySlug: string;
  status: SystemRecordStatus;
  data: Record<string, unknown>;
  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  tenantId: string;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const systemEntityRecordSchema = new Schema<ISystemEntityRecord>(
  {
    entitySlug: { type: String, required: true, trim: true, lowercase: true },
    status: {
      type: String,
      enum: ['active', 'archived', 'draft'],
      default: 'active',
    },
    data: { type: Schema.Types.Mixed, default: {} },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    tenantId: { type: String, required: true, default: DEFAULT_TENANT_ID },
    deletedAt: { type: Date },
  },
  { timestamps: true },
);

systemEntityRecordSchema.index({ tenantId: 1, entitySlug: 1, deletedAt: 1 });
systemEntityRecordSchema.index({ tenantId: 1, entitySlug: 1, status: 1, createdAt: -1 });

export type SystemEntityRecordModel = Model<ISystemEntityRecord>;

export function getSystemEntityRecordModel(
  mongoose: typeof import('mongoose'),
): SystemEntityRecordModel {
  return (
    (mongoose.models.SystemEntityRecord as SystemEntityRecordModel) ??
    mongoose.model<ISystemEntityRecord>('SystemEntityRecord', systemEntityRecordSchema)
  );
}

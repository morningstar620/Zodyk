import { DEFAULT_TENANT_ID } from '@zodyk/core';
import { Schema, type Document, type Model, type Types } from 'mongoose';

export type RevisionResourceType = 'page' | 'meta_entry';

export interface IContentRevision extends Document {
  resourceType: RevisionResourceType;
  resourceId: Types.ObjectId;
  tenantId: string;
  revision: number;
  snapshot: Record<string, unknown>;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const contentRevisionSchema = new Schema<IContentRevision>(
  {
    resourceType: { type: String, required: true, enum: ['page', 'meta_entry'] },
    resourceId: { type: Schema.Types.ObjectId, required: true },
    tenantId: { type: String, required: true, default: DEFAULT_TENANT_ID },
    revision: { type: Number, required: true },
    snapshot: { type: Schema.Types.Mixed, required: true },
    createdBy: { type: String },
  },
  { timestamps: true },
);

contentRevisionSchema.index(
  { tenantId: 1, resourceType: 1, resourceId: 1, revision: -1 },
  { unique: true },
);

export type ContentRevisionModel = Model<IContentRevision>;

export function getContentRevisionModel(mongoose: typeof import('mongoose')): ContentRevisionModel {
  return (
    (mongoose.models.ContentRevision as ContentRevisionModel) ??
    mongoose.model<IContentRevision>('ContentRevision', contentRevisionSchema)
  );
}

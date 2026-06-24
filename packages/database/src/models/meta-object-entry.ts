import { DEFAULT_TENANT_ID } from '@zodyk/core';
import { Schema, type Document, type Model, type Types } from 'mongoose';

export type MetaEntryStatus = 'draft' | 'published' | 'scheduled' | 'archived';

export interface IMetaObjectEntry extends Document {
  metaObjectSlug: string;
  handle: string;
  templateSuffix?: string;
  status: MetaEntryStatus;
  locale: string;
  translations: Record<string, Record<string, unknown>>;
  data: Record<string, unknown>;
  publishedAt?: Date;
  scheduledAt?: Date;
  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  tenantId: string;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const metaObjectEntrySchema = new Schema<IMetaObjectEntry>(
  {
    metaObjectSlug: { type: String, required: true, trim: true, lowercase: true },
    handle: { type: String, required: true, trim: true, lowercase: true },
    templateSuffix: { type: String, trim: true },
    status: {
      type: String,
      enum: ['draft', 'published', 'scheduled', 'archived'],
      default: 'draft',
    },
    locale: { type: String, required: true, default: 'en' },
    translations: { type: Schema.Types.Mixed, default: {} },
    data: { type: Schema.Types.Mixed, default: {} },
    publishedAt: { type: Date },
    scheduledAt: { type: Date },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    tenantId: { type: String, required: true, default: DEFAULT_TENANT_ID },
    deletedAt: { type: Date },
  },
  { timestamps: true },
);

metaObjectEntrySchema.index({ tenantId: 1, metaObjectSlug: 1, handle: 1 }, { unique: true });
metaObjectEntrySchema.index({ tenantId: 1, metaObjectSlug: 1, status: 1, createdAt: -1 });
metaObjectEntrySchema.index({ tenantId: 1, metaObjectSlug: 1, status: 1, publishedAt: -1 });
metaObjectEntrySchema.index({ tenantId: 1, metaObjectSlug: 1, deletedAt: 1 });

export type MetaObjectEntryModel = Model<IMetaObjectEntry>;

export function getMetaObjectEntryModel(mongoose: typeof import('mongoose')): MetaObjectEntryModel {
  return (
    (mongoose.models.MetaObjectEntry as MetaObjectEntryModel) ??
    mongoose.model<IMetaObjectEntry>('MetaObjectEntry', metaObjectEntrySchema)
  );
}

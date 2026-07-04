import { DEFAULT_TENANT_ID } from '@zodyk/core';
import { Schema, type Document, type Model, type Types } from 'mongoose';

export type PageStatus = 'draft' | 'published' | 'scheduled' | 'archived';

export interface IPage extends Document {
  title: string;
  slug: string;
  handle: string;
  parentId?: Types.ObjectId;
  templateSuffix?: string;
  body?: string;
  seo: {
    metaTitle?: string;
    metaDescription?: string;
    ogImage?: string;
    canonicalUrl?: string;
  };
  status: PageStatus;
  publishedAt?: Date;
  scheduledAt?: Date;
  tenantId: string;
  createdAt: Date;
  updatedAt: Date;
}

const pageSchema = new Schema<IPage>(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true, lowercase: true },
    handle: { type: String, required: true, trim: true, lowercase: true },
    parentId: { type: Schema.Types.ObjectId, ref: 'Page' },
    templateSuffix: { type: String, trim: true },
    body: { type: String },
    seo: {
      metaTitle: { type: String },
      metaDescription: { type: String },
      ogImage: { type: String },
      canonicalUrl: { type: String },
    },
    status: {
      type: String,
      enum: ['draft', 'published', 'scheduled', 'archived'],
      default: 'draft',
    },
    publishedAt: { type: Date },
    scheduledAt: { type: Date },
    tenantId: { type: String, required: true, default: DEFAULT_TENANT_ID },
  },
  { timestamps: true },
);

pageSchema.index({ tenantId: 1, slug: 1 }, { unique: true });
pageSchema.index({ tenantId: 1, handle: 1 });
pageSchema.index({ tenantId: 1, status: 1 });
pageSchema.index({ tenantId: 1, parentId: 1 });

export type PageModel = Model<IPage>;

export function getPageModel(mongoose: typeof import('mongoose')): PageModel {
  return (mongoose.models.Page as PageModel) ?? mongoose.model<IPage>('Page', pageSchema);
}

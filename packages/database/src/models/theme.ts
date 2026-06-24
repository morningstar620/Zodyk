import { DEFAULT_TENANT_ID } from '@zodyk/core';
import { randomBytes } from 'node:crypto';
import { Schema, type Document, type Model, type Types } from 'mongoose';

export type ThemeStatus = 'live' | 'draft' | 'archived';

export interface ITheme extends Document {
  name: string;
  slug: string;
  version: string;
  status: ThemeStatus;
  isActive: boolean;
  tenantId: string;
  sourceThemeId?: Types.ObjectId;
  previewToken: string;
  publishedAt?: Date;
  lastSavedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const themeSchema = new Schema<ITheme>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true, lowercase: true },
    version: { type: String, required: true, default: '1.0.0' },
    status: {
      type: String,
      enum: ['live', 'draft', 'archived'],
      default: 'draft',
    },
    isActive: { type: Boolean, default: false },
    tenantId: { type: String, required: true, default: DEFAULT_TENANT_ID },
    sourceThemeId: { type: Schema.Types.ObjectId, ref: 'Theme' },
    previewToken: {
      type: String,
      required: true,
      default: () => randomBytes(24).toString('hex'),
    },
    publishedAt: { type: Date },
    lastSavedAt: { type: Date },
  },
  { timestamps: true },
);

themeSchema.index({ tenantId: 1, slug: 1 }, { unique: true });
themeSchema.index({ tenantId: 1, status: 1 });
themeSchema.index({ tenantId: 1, isActive: 1 });

export type ThemeModel = Model<ITheme>;

export function getThemeModel(mongoose: typeof import('mongoose')): ThemeModel {
  return (
    (mongoose.models.Theme as ThemeModel) ?? mongoose.model<ITheme>('Theme', themeSchema)
  );
}

import { DEFAULT_TENANT_ID } from '@zodyk/core';
import { Schema, type Document, type Model } from 'mongoose';

export interface IR2Settings {
  accountId: string;
  accessKeyId: string;
  secretAccessKeyEncrypted: string;
  bucket: string;
  publicUrl?: string;
  endpoint?: string;
}

export interface IPlatformSettings extends Document {
  tenantId: string;
  media?: {
    r2?: IR2Settings;
  };
  createdAt: Date;
  updatedAt: Date;
}

const r2SettingsSchema = new Schema<IR2Settings>(
  {
    accountId: { type: String, required: true },
    accessKeyId: { type: String, required: true },
    secretAccessKeyEncrypted: { type: String, required: true },
    bucket: { type: String, required: true },
    publicUrl: { type: String },
    endpoint: { type: String },
  },
  { _id: false },
);

const platformSettingsSchema = new Schema<IPlatformSettings>(
  {
    tenantId: { type: String, required: true, default: DEFAULT_TENANT_ID },
    media: {
      r2: r2SettingsSchema,
    },
  },
  { timestamps: true },
);

platformSettingsSchema.index({ tenantId: 1 }, { unique: true });

export type PlatformSettingsModel = Model<IPlatformSettings>;

export function getPlatformSettingsModel(
  mongoose: typeof import('mongoose'),
): PlatformSettingsModel {
  return (
    (mongoose.models.PlatformSettings as PlatformSettingsModel) ??
    mongoose.model<IPlatformSettings>('PlatformSettings', platformSettingsSchema)
  );
}

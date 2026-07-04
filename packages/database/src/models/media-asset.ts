import { DEFAULT_TENANT_ID } from '@zodyk/core';
import { Schema, type Document, type Model } from 'mongoose';

export interface IMediaVariant {
  format: 'webp' | 'avif';
  r2Key: string;
  width: number;
  height: number;
  size: number;
}

export interface IMediaMetadata {
  alt?: string;
  title?: string;
  caption?: string;
}

export interface IMediaAsset extends Document {
  filename: string;
  originalFilename: string;
  mimeType: string;
  size: number;
  width?: number;
  height?: number;
  folder: string;
  r2Key: string;
  variants: IMediaVariant[];
  metadata: IMediaMetadata;
  uploadedBy?: Schema.Types.ObjectId;
  tenantId: string;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const mediaVariantSchema = new Schema<IMediaVariant>(
  {
    format: { type: String, enum: ['webp', 'avif'], required: true },
    r2Key: { type: String, required: true },
    width: { type: Number, required: true },
    height: { type: Number, required: true },
    size: { type: Number, required: true },
  },
  { _id: false },
);

const mediaAssetSchema = new Schema<IMediaAsset>(
  {
    filename: { type: String, required: true, trim: true },
    originalFilename: { type: String, required: true, trim: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    width: { type: Number },
    height: { type: Number },
    folder: { type: String, required: true, default: '/' },
    r2Key: { type: String, required: true },
    variants: { type: [mediaVariantSchema], default: [] },
    metadata: {
      alt: { type: String },
      title: { type: String },
      caption: { type: String },
    },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    tenantId: { type: String, required: true, default: DEFAULT_TENANT_ID },
    deletedAt: { type: Date },
  },
  { timestamps: true },
);

mediaAssetSchema.index({ tenantId: 1, folder: 1, createdAt: -1 });
mediaAssetSchema.index({ tenantId: 1, deletedAt: 1, createdAt: -1 });
mediaAssetSchema.index({ tenantId: 1, originalFilename: 1 });
mediaAssetSchema.index({ tenantId: 1, mimeType: 1 });

export type MediaAssetModel = Model<IMediaAsset>;

export function getMediaAssetModel(mongoose: typeof import('mongoose')): MediaAssetModel {
  return (
    (mongoose.models.MediaAsset as MediaAssetModel) ??
    mongoose.model<IMediaAsset>('MediaAsset', mediaAssetSchema)
  );
}

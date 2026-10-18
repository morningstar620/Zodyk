import { DEFAULT_TENANT_ID } from '@zodyk/core';
import { Schema, type Document, type Model } from 'mongoose';

export interface IRedirect extends Document {
  fromPath: string;
  toPath: string;
  statusCode: 301 | 302;
  enabled: boolean;
  tenantId: string;
  createdAt: Date;
  updatedAt: Date;
}

const redirectSchema = new Schema<IRedirect>(
  {
    fromPath: { type: String, required: true, trim: true },
    toPath: { type: String, required: true, trim: true },
    statusCode: { type: Number, enum: [301, 302], required: true },
    enabled: { type: Boolean, required: true, default: true },
    tenantId: { type: String, required: true, default: DEFAULT_TENANT_ID },
  },
  { timestamps: true },
);

redirectSchema.index({ tenantId: 1, fromPath: 1 }, { unique: true });

export type RedirectModel = Model<IRedirect>;

export function getRedirectModel(mongoose: typeof import('mongoose')): RedirectModel {
  return (
    (mongoose.models.Redirect as RedirectModel) ??
    mongoose.model<IRedirect>('Redirect', redirectSchema)
  );
}

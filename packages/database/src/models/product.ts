import { DEFAULT_TENANT_ID, PRODUCT_STATUSES, type ProductStatus } from '@zodyk/core';
import { Schema, type Document, type Model } from 'mongoose';

export interface IProduct extends Document {
  tenantId: string;
  name: string;
  description?: string;
  image?: string;
  status: ProductStatus;
  metadata?: Record<string, string>;
  createdAt: Date;
  updatedAt: Date;
}

const productSchema = new Schema<IProduct>(
  {
    tenantId: { type: String, required: true, default: DEFAULT_TENANT_ID },
    name: { type: String, required: true, trim: true },
    description: { type: String },
    image: { type: String },
    status: {
      type: String,
      required: true,
      enum: PRODUCT_STATUSES,
      default: 'active',
    },
    metadata: { type: Map, of: String },
  },
  { timestamps: true },
);

productSchema.index({ tenantId: 1, createdAt: -1 });
productSchema.index({ tenantId: 1, status: 1, createdAt: -1 });

export type ProductModel = Model<IProduct>;

export function getProductModel(mongoose: typeof import('mongoose')): ProductModel {
  return (
    (mongoose.models.Product as ProductModel) ?? mongoose.model<IProduct>('Product', productSchema)
  );
}

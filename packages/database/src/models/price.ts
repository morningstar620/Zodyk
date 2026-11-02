import {
  DEFAULT_TENANT_ID,
  PRICE_INTERVALS,
  PRICE_TYPES,
  PRODUCT_STATUSES,
  type PriceInterval,
  type PriceType,
  type ProductStatus,
} from '@zodyk/core';
import { Schema, type Document, type Model, type Types } from 'mongoose';

export interface IPrice extends Document {
  tenantId: string;
  productId: Types.ObjectId;
  type: PriceType;
  amount: number;
  currency: string;
  interval?: PriceInterval;
  intervalCount: number;
  trialDays?: number;
  nickname?: string;
  gatewayPriceId?: string;
  publicToken: string;
  status: ProductStatus;
  createdAt: Date;
  updatedAt: Date;
}

const priceSchema = new Schema<IPrice>(
  {
    tenantId: { type: String, required: true, default: DEFAULT_TENANT_ID },
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    type: { type: String, required: true, enum: PRICE_TYPES },
    amount: { type: Number, required: true },
    currency: { type: String, required: true, uppercase: true },
    interval: { type: String, enum: PRICE_INTERVALS },
    intervalCount: { type: Number, required: true, default: 1 },
    trialDays: { type: Number },
    nickname: { type: String },
    gatewayPriceId: { type: String },
    publicToken: { type: String, required: true },
    status: {
      type: String,
      required: true,
      enum: PRODUCT_STATUSES,
      default: 'active',
    },
  },
  { timestamps: true },
);

priceSchema.index({ tenantId: 1, publicToken: 1 }, { unique: true });
priceSchema.index({ tenantId: 1, productId: 1, status: 1 });
priceSchema.index({ tenantId: 1, createdAt: -1 });

export type PriceModel = Model<IPrice>;

export function getPriceModel(mongoose: typeof import('mongoose')): PriceModel {
  return (mongoose.models.Price as PriceModel) ?? mongoose.model<IPrice>('Price', priceSchema);
}

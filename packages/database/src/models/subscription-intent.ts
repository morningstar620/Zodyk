import { DEFAULT_TENANT_ID, SUBSCRIPTION_STATUSES, type SubscriptionStatus } from '@zodyk/core';
import { Schema, type Document, type Model } from 'mongoose';

export interface ISubscriptionIntentCustomer {
  id?: string;
  email?: string;
  name?: string;
}

export interface ISubscriptionIntent extends Document {
  tenantId: string;
  amount: number;
  currency: string;
  interval: 'day' | 'week' | 'month' | 'year';
  intervalCount: number;
  trialDays?: number;
  status: SubscriptionStatus;
  referenceType: string;
  referenceId: string;
  gateway: string;
  gatewaySubscriptionId?: string;
  checkoutUrl?: string;
  clientSecret?: string;
  customer?: ISubscriptionIntentCustomer;
  description?: string;
  metadata?: Record<string, string>;
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
  cancelAtPeriodEnd: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const customerSchema = new Schema<ISubscriptionIntentCustomer>(
  {
    id: { type: String },
    email: { type: String },
    name: { type: String },
  },
  { _id: false },
);

const subscriptionIntentSchema = new Schema<ISubscriptionIntent>(
  {
    tenantId: { type: String, required: true, default: DEFAULT_TENANT_ID },
    amount: { type: Number, required: true },
    currency: { type: String, required: true, uppercase: true },
    interval: {
      type: String,
      required: true,
      enum: ['day', 'week', 'month', 'year'],
    },
    intervalCount: { type: Number, required: true, default: 1 },
    trialDays: { type: Number },
    status: {
      type: String,
      required: true,
      enum: SUBSCRIPTION_STATUSES,
      default: 'pending',
    },
    referenceType: { type: String, required: true },
    referenceId: { type: String, required: true },
    gateway: { type: String, required: true },
    gatewaySubscriptionId: { type: String },
    checkoutUrl: { type: String },
    clientSecret: { type: String },
    customer: { type: customerSchema },
    description: { type: String },
    metadata: { type: Map, of: String },
    currentPeriodStart: { type: Date },
    currentPeriodEnd: { type: Date },
    cancelAtPeriodEnd: { type: Boolean, required: true, default: false },
  },
  { timestamps: true },
);

subscriptionIntentSchema.index({ tenantId: 1, createdAt: -1 });
subscriptionIntentSchema.index({ tenantId: 1, referenceType: 1, referenceId: 1 });
subscriptionIntentSchema.index({ tenantId: 1, gateway: 1, gatewaySubscriptionId: 1 });
subscriptionIntentSchema.index({ tenantId: 1, status: 1 });

export type SubscriptionIntentModel = Model<ISubscriptionIntent>;

export function getSubscriptionIntentModel(
  mongoose: typeof import('mongoose'),
): SubscriptionIntentModel {
  return (
    (mongoose.models.SubscriptionIntent as SubscriptionIntentModel) ??
    mongoose.model<ISubscriptionIntent>('SubscriptionIntent', subscriptionIntentSchema)
  );
}

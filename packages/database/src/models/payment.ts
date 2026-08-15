import { DEFAULT_TENANT_ID, PAYMENT_STATUSES, type PaymentStatus } from '@zodyk/core';
import { Schema, type Document, type Model } from 'mongoose';

export interface IPaymentCustomer {
  id?: string;
  email?: string;
  name?: string;
}

export interface IPayment extends Document {
  tenantId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  referenceType: string;
  referenceId: string;
  gateway: string;
  gatewayPaymentId?: string;
  checkoutUrl?: string;
  clientSecret?: string;
  customer?: IPaymentCustomer;
  description?: string;
  metadata?: Record<string, string>;
  idempotencyKey?: string;
  refundedAmount: number;
  paidAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const paymentCustomerSchema = new Schema<IPaymentCustomer>(
  {
    id: { type: String },
    email: { type: String },
    name: { type: String },
  },
  { _id: false },
);

const paymentSchema = new Schema<IPayment>(
  {
    tenantId: { type: String, required: true, default: DEFAULT_TENANT_ID },
    amount: { type: Number, required: true },
    currency: { type: String, required: true, uppercase: true },
    status: {
      type: String,
      required: true,
      enum: PAYMENT_STATUSES,
      default: 'pending',
    },
    referenceType: { type: String, required: true },
    referenceId: { type: String, required: true },
    gateway: { type: String, required: true },
    gatewayPaymentId: { type: String },
    checkoutUrl: { type: String },
    clientSecret: { type: String },
    customer: { type: paymentCustomerSchema },
    description: { type: String },
    metadata: { type: Map, of: String },
    idempotencyKey: { type: String },
    refundedAmount: { type: Number, required: true, default: 0 },
    paidAt: { type: Date },
  },
  { timestamps: true },
);

paymentSchema.index({ tenantId: 1, createdAt: -1 });
paymentSchema.index({ tenantId: 1, status: 1, createdAt: -1 });
paymentSchema.index({ tenantId: 1, referenceType: 1, referenceId: 1 });
paymentSchema.index({ tenantId: 1, gateway: 1, gatewayPaymentId: 1 });
paymentSchema.index(
  { tenantId: 1, idempotencyKey: 1 },
  { unique: true, sparse: true },
);

export type PaymentModel = Model<IPayment>;

export function getPaymentModel(mongoose: typeof import('mongoose')): PaymentModel {
  return (
    (mongoose.models.Payment as PaymentModel) ??
    mongoose.model<IPayment>('Payment', paymentSchema)
  );
}

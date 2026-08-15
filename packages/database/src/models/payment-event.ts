import { DEFAULT_TENANT_ID } from '@zodyk/core';
import { Schema, type Document, type Model, type Types } from 'mongoose';

export interface IPaymentEvent extends Document {
  tenantId: string;
  gateway: string;
  eventId: string;
  type: string;
  paymentId?: Types.ObjectId;
  payload: Record<string, unknown>;
  processedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const paymentEventSchema = new Schema<IPaymentEvent>(
  {
    tenantId: { type: String, required: true, default: DEFAULT_TENANT_ID },
    gateway: { type: String, required: true },
    eventId: { type: String, required: true },
    type: { type: String, required: true },
    paymentId: { type: Schema.Types.ObjectId, ref: 'Payment' },
    payload: { type: Schema.Types.Mixed, required: true, default: {} },
    processedAt: { type: Date },
  },
  { timestamps: true },
);

paymentEventSchema.index({ tenantId: 1, gateway: 1, eventId: 1 }, { unique: true });
paymentEventSchema.index({ tenantId: 1, paymentId: 1, createdAt: -1 });

export type PaymentEventModel = Model<IPaymentEvent>;

export function getPaymentEventModel(
  mongoose: typeof import('mongoose'),
): PaymentEventModel {
  return (
    (mongoose.models.PaymentEvent as PaymentEventModel) ??
    mongoose.model<IPaymentEvent>('PaymentEvent', paymentEventSchema)
  );
}

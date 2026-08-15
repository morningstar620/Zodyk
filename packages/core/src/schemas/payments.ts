import { z } from 'zod';

export const PAYMENT_STATUSES = [
  'pending',
  'requires_action',
  'paid',
  'failed',
  'refunded',
  'partially_refunded',
  'cancelled',
] as const;

export const SUBSCRIPTION_STATUSES = [
  'trialing',
  'active',
  'past_due',
  'paused',
  'cancelled',
] as const;

export const PAYMENT_MODES = ['test', 'live'] as const;

export const BUILTIN_GATEWAY_IDS = [
  'stripe',
  'razorpay',
  'paypal',
  'cashfree',
  'phonepe',
  'payu',
  'custom',
] as const;

export const paymentReferenceSchema = z.object({
  type: z.string().min(1).max(100),
  id: z.string().min(1).max(200),
});

export const paymentCustomerSchema = z.object({
  id: z.string().min(1).max(200).optional(),
  email: z.string().email().optional(),
  name: z.string().min(1).max(200).optional(),
});

export const createPaymentSchema = z.object({
  amount: z.number().int().positive(),
  currency: z.string().length(3).transform((v) => v.toUpperCase()),
  reference: paymentReferenceSchema,
  customer: paymentCustomerSchema.optional(),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
  description: z.string().max(500).optional(),
  metadata: z.record(z.string(), z.string()).optional(),
  idempotencyKey: z.string().min(1).max(200).optional(),
  gateway: z.string().min(1).max(50).optional(),
});

export const refundPaymentSchema = z.object({
  amount: z.number().int().positive().optional(),
  reason: z.string().max(500).optional(),
});

export const paymentListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(PAYMENT_STATUSES).optional(),
  referenceType: z.string().min(1).max(100).optional(),
  referenceId: z.string().min(1).max(200).optional(),
  gateway: z.string().min(1).max(50).optional(),
});

export const createSubscriptionSchema = z.object({
  amount: z.number().int().positive(),
  currency: z.string().length(3).transform((v) => v.toUpperCase()),
  interval: z.enum(['day', 'week', 'month', 'year']),
  intervalCount: z.number().int().min(1).max(365).default(1),
  trialDays: z.number().int().min(0).max(365).optional(),
  reference: paymentReferenceSchema,
  customer: paymentCustomerSchema.optional(),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
  description: z.string().max(500).optional(),
  metadata: z.record(z.string(), z.string()).optional(),
  gateway: z.string().min(1).max(50).optional(),
});

export const paymentsSettingsUpdateSchema = z.object({
  activeGateway: z.string().min(1).max(50).optional(),
  mode: z.enum(PAYMENT_MODES).optional(),
  gateway: z.string().min(1).max(50),
  credentials: z.record(z.string(), z.union([z.string(), z.boolean(), z.number()])).optional(),
});

export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];
export type PaymentMode = (typeof PAYMENT_MODES)[number];
export type BuiltinGatewayId = (typeof BUILTIN_GATEWAY_IDS)[number];
export type PaymentReference = z.infer<typeof paymentReferenceSchema>;
export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
export type RefundPaymentInput = z.infer<typeof refundPaymentSchema>;
export type PaymentListQuery = z.infer<typeof paymentListQuerySchema>;
export type CreateSubscriptionInput = z.infer<typeof createSubscriptionSchema>;
export type PaymentsSettingsUpdate = z.infer<typeof paymentsSettingsUpdateSchema>;

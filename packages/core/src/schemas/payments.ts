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
  'pending',
  'trialing',
  'active',
  'past_due',
  'paused',
  'cancelled',
] as const;

export const PRODUCT_STATUSES = ['active', 'archived'] as const;

export const PRICE_TYPES = ['one_time', 'recurring'] as const;

export const PRICE_INTERVALS = ['day', 'week', 'month', 'year'] as const;

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
  currency: z
    .string()
    .length(3)
    .transform((v) => v.toUpperCase()),
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

export const subscriptionListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(SUBSCRIPTION_STATUSES).optional(),
  gateway: z.string().min(1).max(50).optional(),
});

export const paymentEventListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  gateway: z.string().min(1).max(50).optional(),
  processed: z.enum(['true', 'false']).optional(),
});

export const createProductSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  image: z.string().max(2000).optional(),
  status: z.enum(PRODUCT_STATUSES).optional(),
  metadata: z.record(z.string(), z.string()).optional(),
});

export const updateProductSchema = z
  .object({
    name: z.string().min(1).max(200).optional(),
    description: z.string().max(5000).optional(),
    image: z.string().max(2000).optional(),
    status: z.enum(PRODUCT_STATUSES).optional(),
    metadata: z.record(z.string(), z.string()).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: 'No product fields to update' });

export const createPriceSchema = z
  .object({
    productId: z.string().min(1).max(200),
    type: z.enum(PRICE_TYPES),
    amount: z.number().int().positive(),
    currency: z
      .string()
      .length(3)
      .transform((v) => v.toUpperCase()),
    interval: z.enum(PRICE_INTERVALS).optional(),
    intervalCount: z.number().int().min(1).max(365).optional(),
    trialDays: z.number().int().min(0).max(365).optional(),
    nickname: z.string().max(200).optional(),
    status: z.enum(PRODUCT_STATUSES).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.type === 'recurring' && !value.interval) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['interval'],
        message: 'interval is required for recurring prices',
      });
    }
  });

export const updatePriceSchema = z
  .object({
    type: z.enum(PRICE_TYPES).optional(),
    amount: z.number().int().positive().optional(),
    currency: z
      .string()
      .length(3)
      .transform((v) => v.toUpperCase())
      .optional(),
    interval: z.enum(PRICE_INTERVALS).optional(),
    intervalCount: z.number().int().min(1).max(365).optional(),
    trialDays: z.number().int().min(0).max(365).optional(),
    nickname: z.string().max(200).optional(),
    status: z.enum(PRODUCT_STATUSES).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: 'No price fields to update' });

export const paymentLinkCheckoutSchema = z.object({
  customer: z.object({
    email: z.string().email(),
    name: z.string().min(1).max(200).optional(),
  }),
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
});

export const createSubscriptionSchema = z.object({
  amount: z.number().int().positive(),
  currency: z
    .string()
    .length(3)
    .transform((v) => v.toUpperCase()),
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
export type SubscriptionListQuery = z.infer<typeof subscriptionListQuerySchema>;
export type PaymentEventListQuery = z.infer<typeof paymentEventListQuerySchema>;
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];
export type PriceType = (typeof PRICE_TYPES)[number];
export type PriceInterval = (typeof PRICE_INTERVALS)[number];
export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type CreatePriceInput = z.infer<typeof createPriceSchema>;
export type UpdatePriceInput = z.infer<typeof updatePriceSchema>;
export type PaymentLinkCheckoutInput = z.infer<typeof paymentLinkCheckoutSchema>;

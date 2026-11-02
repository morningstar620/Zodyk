import type { CreatePaymentInput, CreateSubscriptionInput, PaymentMode } from '@zodyk/core';
import type { z } from 'zod';

export type GatewayId =
  | 'stripe'
  | 'razorpay'
  | 'paypal'
  | 'cashfree'
  | 'phonepe'
  | 'payu'
  | 'custom'
  | (string & {});

export interface GatewayCapabilities {
  oneTime: boolean;
  refunds: boolean;
  webhooks: boolean;
  subscriptions: boolean;
}

export interface CredentialFieldMeta {
  key: string;
  label: string;
  secret?: boolean;
  required?: boolean;
  placeholder?: string;
}

export type NormalizedPaymentEventType =
  | 'payment.succeeded'
  | 'payment.failed'
  | 'payment.cancelled'
  | 'payment.refunded'
  | 'subscription.updated'
  | 'subscription.cancelled'
  | 'unknown';

export interface NormalizedPaymentEvent {
  type: NormalizedPaymentEventType;
  eventId: string;
  gatewayPaymentId?: string;
  gatewaySubscriptionId?: string;
  /** Internal SubscriptionIntent id from gateway metadata. */
  subscriptionId?: string;
  paymentId?: string;
  amount?: number;
  currency?: string;
  status?: string;
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
  /**
   * Checkout confirmation may only move a pending intent forward.
   * Subscription lifecycle webhooks are authoritative and always apply.
   */
  promotePendingOnly?: boolean;
  raw: unknown;
}

export interface CreateCheckoutResult {
  checkoutUrl?: string;
  clientSecret?: string;
  gatewayPaymentId: string;
  raw?: unknown;
}

export interface CreateSubscriptionResult {
  checkoutUrl?: string;
  clientSecret?: string;
  gatewaySubscriptionId: string;
  raw?: unknown;
}

export interface RefundResult {
  gatewayRefundId: string;
  raw?: unknown;
}

export interface GatewayConfig {
  mode: PaymentMode;
  credentials: Record<string, string>;
}

export interface PaymentGateway {
  readonly id: GatewayId;
  readonly label: string;
  readonly capabilities: GatewayCapabilities;
  createCheckout(input: CreatePaymentInput & { paymentId: string }): Promise<CreateCheckoutResult>;
  refund(input: {
    gatewayPaymentId: string;
    amount?: number;
    reason?: string;
  }): Promise<RefundResult>;
  verifyWebhook(req: {
    headers: Headers | Record<string, string | string[] | undefined>;
    rawBody: string;
  }): Promise<NormalizedPaymentEvent>;
  createSubscription?(
    input: CreateSubscriptionInput & { subscriptionId: string },
  ): Promise<CreateSubscriptionResult>;
  cancelSubscription?(input: { gatewaySubscriptionId: string }): Promise<void>;
}

export interface PaymentGatewayDefinition {
  id: GatewayId;
  label: string;
  description?: string;
  region?: string;
  /** Whether the adapter is fully implemented */
  ready: boolean;
  capabilities: GatewayCapabilities;
  credentialFields: CredentialFieldMeta[];
  credentialsSchema: z.ZodType<Record<string, string>>;
  create: (config: GatewayConfig) => PaymentGateway;
}

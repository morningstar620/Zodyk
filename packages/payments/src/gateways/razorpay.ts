import { createHmac, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import Razorpay from 'razorpay';
import type { CreatePaymentInput } from '@zodyk/core';
import { CapabilityNotSupportedError, WebhookVerificationError } from '../errors';
import type {
  CreateCheckoutResult,
  GatewayConfig,
  NormalizedPaymentEvent,
  PaymentGateway,
  PaymentGatewayDefinition,
  RefundResult,
} from '../types';
import { headerValue } from '../utils';

const credentialsSchema = z.object({
  keyId: z.string().min(1),
  keySecret: z.string().min(1),
  webhookSecret: z.string().min(1).optional().or(z.literal('')),
});

function verifyRazorpaySignature(body: string, signature: string, secret: string): boolean {
  const expected = createHmac('sha256', secret).update(body).digest('hex');
  try {
    const a = Buffer.from(expected);
    const b = Buffer.from(signature);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

function createRazorpayGateway(config: GatewayConfig): PaymentGateway {
  const parsed = credentialsSchema.parse(config.credentials);
  const client = new Razorpay({
    key_id: parsed.keyId,
    key_secret: parsed.keySecret,
  });

  return {
    id: 'razorpay',
    label: 'Razorpay',
    capabilities: {
      oneTime: true,
      refunds: true,
      webhooks: true,
      subscriptions: false,
    },

    async createCheckout(
      input: CreatePaymentInput & { paymentId: string },
    ): Promise<CreateCheckoutResult> {
      const order = await client.orders.create({
        amount: input.amount,
        currency: input.currency,
        receipt: input.paymentId.slice(0, 40),
        notes: {
          paymentId: input.paymentId,
          referenceType: input.reference.type,
          referenceId: input.reference.id,
          ...input.metadata,
        },
      });

      const linkPayload: Record<string, unknown> = {
        amount: input.amount,
        currency: input.currency,
        accept_partial: false,
        description: input.description || `Payment ${input.paymentId}`,
        notify: { email: Boolean(input.customer?.email), sms: false },
        reminder_enable: false,
        callback_url: input.successUrl,
        callback_method: 'get',
        notes: {
          paymentId: input.paymentId,
          referenceType: input.reference.type,
          referenceId: input.reference.id,
          razorpayOrderId: order.id,
          ...input.metadata,
        },
      };
      if (input.customer?.email) {
        linkPayload.customer = {
          email: input.customer.email,
          ...(input.customer.name ? { name: input.customer.name } : {}),
        };
      }

      const link = (await client.paymentLink.create(
        linkPayload as unknown as Parameters<typeof client.paymentLink.create>[0],
      )) as { short_url?: string; id?: string };

      return {
        checkoutUrl: link.short_url,
        gatewayPaymentId: order.id,
        raw: { order, link },
      };
    },

    async refund(input: {
      gatewayPaymentId: string;
      amount?: number;
      reason?: string;
    }): Promise<RefundResult> {
      let paymentId = input.gatewayPaymentId;
      if (paymentId.startsWith('order_')) {
        const payments = await client.orders.fetchPayments(paymentId);
        const captured = (payments.items as Array<{ id: string; status: string }>).find(
          (p) => p.status === 'captured',
        );
        if (!captured) {
          throw new Error('No captured Razorpay payment found for this order');
        }
        paymentId = captured.id;
      }

      const refund = await client.payments.refund(paymentId, {
        amount: input.amount,
        notes: input.reason ? { reason: input.reason } : undefined,
      });

      return {
        gatewayRefundId: (refund as { id: string }).id,
        raw: refund,
      };
    },

    async verifyWebhook(req: {
      headers: Headers | Record<string, string | string[] | undefined>;
      rawBody: string;
    }): Promise<NormalizedPaymentEvent> {
      const signature = headerValue(req.headers, 'x-razorpay-signature');
      if (!signature || !parsed.webhookSecret) {
        throw new WebhookVerificationError('Missing Razorpay webhook secret or signature');
      }
      if (!verifyRazorpaySignature(req.rawBody, signature, parsed.webhookSecret)) {
        throw new WebhookVerificationError('Invalid Razorpay webhook signature');
      }

      const payload = JSON.parse(req.rawBody) as {
        event: string;
        payload?: {
          payment?: { entity?: Record<string, unknown> };
          payment_link?: { entity?: Record<string, unknown> };
          refund?: { entity?: Record<string, unknown> };
        };
      };

      const eventId =
        (payload.payload?.payment?.entity?.id as string | undefined) ||
        (payload.payload?.payment_link?.entity?.id as string | undefined) ||
        `${payload.event}-${Date.now()}`;

      const paymentEntity = payload.payload?.payment?.entity;
      const notes = (paymentEntity?.notes ?? {}) as Record<string, string>;

      if (payload.event === 'payment.captured' || payload.event === 'payment_link.paid') {
        return {
          type: 'payment.succeeded',
          eventId: String(eventId),
          gatewayPaymentId: String(
            paymentEntity?.order_id || paymentEntity?.id || notes.razorpayOrderId || eventId,
          ),
          paymentId: notes.paymentId,
          amount: typeof paymentEntity?.amount === 'number' ? paymentEntity.amount : undefined,
          currency:
            typeof paymentEntity?.currency === 'string'
              ? paymentEntity.currency.toUpperCase()
              : undefined,
          status: 'paid',
          raw: payload,
        };
      }

      if (payload.event === 'payment.failed') {
        return {
          type: 'payment.failed',
          eventId: String(eventId),
          gatewayPaymentId: String(paymentEntity?.order_id || paymentEntity?.id || eventId),
          paymentId: notes.paymentId,
          status: 'failed',
          raw: payload,
        };
      }

      if (payload.event === 'refund.processed') {
        const refundEntity = payload.payload?.refund?.entity;
        return {
          type: 'payment.refunded',
          eventId: String(refundEntity?.id || eventId),
          gatewayPaymentId: String(refundEntity?.payment_id || eventId),
          amount: typeof refundEntity?.amount === 'number' ? refundEntity.amount : undefined,
          raw: payload,
        };
      }

      return { type: 'unknown', eventId: String(eventId), raw: payload };
    },

    async createSubscription(): Promise<never> {
      throw new CapabilityNotSupportedError('razorpay', 'subscriptions');
    },

    async cancelSubscription(): Promise<never> {
      throw new CapabilityNotSupportedError('razorpay', 'subscriptions');
    },
  };
}

export const razorpayGatewayDefinition: PaymentGatewayDefinition = {
  id: 'razorpay',
  label: 'Razorpay',
  description: 'India / SEA payments via Orders and Payment Links',
  region: 'India / SEA',
  ready: true,
  capabilities: {
    oneTime: true,
    refunds: true,
    webhooks: true,
    subscriptions: false,
  },
  credentialFields: [
    { key: 'keyId', label: 'Key ID', secret: false, required: true },
    { key: 'keySecret', label: 'Key secret', secret: true, required: true },
    { key: 'webhookSecret', label: 'Webhook secret', secret: true },
  ],
  credentialsSchema: credentialsSchema,
  create: createRazorpayGateway,
};

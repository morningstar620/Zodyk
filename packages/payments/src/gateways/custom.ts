import { z } from 'zod';
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
import { headerValue, verifyHmacSha256 } from '../utils';

const credentialsSchema = z.object({
  createCheckoutUrl: z.string().url(),
  refundUrl: z.string().url().optional().or(z.literal('')),
  webhookSecret: z.string().min(1),
  apiKey: z.string().optional().or(z.literal('')),
  signingSecret: z.string().optional().or(z.literal('')),
});

async function postJson(
  url: string,
  body: unknown,
  headers: Record<string, string>,
): Promise<Record<string, unknown>> {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...headers,
    },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    throw new Error(
      typeof data.message === 'string'
        ? data.message
        : `Custom gateway request failed (${res.status})`,
    );
  }
  return data;
}

function createCustomGateway(config: GatewayConfig): PaymentGateway {
  const parsed = credentialsSchema.parse(config.credentials);

  return {
    id: 'custom',
    label: 'Custom',
    capabilities: {
      oneTime: true,
      refunds: Boolean(parsed.refundUrl),
      webhooks: true,
      subscriptions: false,
    },

    async createCheckout(
      input: CreatePaymentInput & { paymentId: string },
    ): Promise<CreateCheckoutResult> {
      const headers: Record<string, string> = {};
      if (parsed.apiKey) headers.authorization = `Bearer ${parsed.apiKey}`;

      const data = await postJson(
        parsed.createCheckoutUrl,
        {
          paymentId: input.paymentId,
          amount: input.amount,
          currency: input.currency,
          reference: input.reference,
          customer: input.customer,
          successUrl: input.successUrl,
          cancelUrl: input.cancelUrl,
          description: input.description,
          metadata: input.metadata,
          mode: config.mode,
        },
        headers,
      );

      const gatewayPaymentId =
        (data.gatewayPaymentId as string | undefined) ||
        (data.id as string | undefined) ||
        input.paymentId;
      const checkoutUrl =
        (data.checkoutUrl as string | undefined) || (data.url as string | undefined);
      const clientSecret = data.clientSecret as string | undefined;

      return { gatewayPaymentId, checkoutUrl, clientSecret, raw: data };
    },

    async refund(input: {
      gatewayPaymentId: string;
      amount?: number;
      reason?: string;
    }): Promise<RefundResult> {
      if (!parsed.refundUrl) {
        throw new CapabilityNotSupportedError('custom', 'refunds');
      }
      const headers: Record<string, string> = {};
      if (parsed.apiKey) headers.authorization = `Bearer ${parsed.apiKey}`;

      const data = await postJson(
        parsed.refundUrl,
        {
          gatewayPaymentId: input.gatewayPaymentId,
          amount: input.amount,
          reason: input.reason,
          mode: config.mode,
        },
        headers,
      );

      return {
        gatewayRefundId:
          (data.gatewayRefundId as string | undefined) ||
          (data.id as string | undefined) ||
          `refund_${Date.now()}`,
        raw: data,
      };
    },

    async verifyWebhook(req: {
      headers: Headers | Record<string, string | string[] | undefined>;
      rawBody: string;
    }): Promise<NormalizedPaymentEvent> {
      const signature =
        headerValue(req.headers, 'x-zodyk-signature') ||
        headerValue(req.headers, 'x-webhook-signature');
      if (!signature) {
        throw new WebhookVerificationError('Missing custom webhook signature');
      }
      if (!verifyHmacSha256(req.rawBody, parsed.webhookSecret, signature, 'hex')) {
        // also try base64
        if (!verifyHmacSha256(req.rawBody, parsed.webhookSecret, signature, 'base64')) {
          throw new WebhookVerificationError('Invalid custom webhook signature');
        }
      }

      const payload = JSON.parse(req.rawBody) as Record<string, unknown>;
      const type = (payload.type as NormalizedPaymentEvent['type'] | undefined) || 'unknown';

      return {
        type,
        eventId: String(payload.eventId || payload.id || `${type}-${Date.now()}`),
        gatewayPaymentId: payload.gatewayPaymentId as string | undefined,
        gatewaySubscriptionId: payload.gatewaySubscriptionId as string | undefined,
        subscriptionId:
          typeof payload.subscriptionId === 'string' ? payload.subscriptionId : undefined,
        paymentId: payload.paymentId as string | undefined,
        amount: typeof payload.amount === 'number' ? payload.amount : undefined,
        currency: typeof payload.currency === 'string' ? payload.currency : undefined,
        status: typeof payload.status === 'string' ? payload.status : undefined,
        raw: payload,
      };
    },
  };
}

export const customGatewayDefinition: PaymentGatewayDefinition = {
  id: 'custom',
  label: 'Custom',
  description: 'HTTP escape hatch: POST create-checkout URL with a signed webhook callback',
  region: 'Any',
  ready: true,
  capabilities: {
    oneTime: true,
    refunds: true,
    webhooks: true,
    subscriptions: false,
  },
  credentialFields: [
    {
      key: 'createCheckoutUrl',
      label: 'Create checkout URL',
      required: true,
      placeholder: 'https://psp.example.com/checkout',
    },
    {
      key: 'refundUrl',
      label: 'Refund URL (optional)',
      placeholder: 'https://psp.example.com/refund',
    },
    { key: 'webhookSecret', label: 'Webhook HMAC secret', secret: true, required: true },
    { key: 'apiKey', label: 'API key (optional Bearer)', secret: true },
    { key: 'signingSecret', label: 'Outbound signing secret (optional)', secret: true },
  ],
  credentialsSchema: credentialsSchema,
  create: createCustomGateway,
};

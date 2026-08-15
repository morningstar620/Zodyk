import { z } from 'zod';
import Stripe from 'stripe';
import type { CreatePaymentInput, CreateSubscriptionInput } from '@zodyk/core';
import { CapabilityNotSupportedError, WebhookVerificationError } from '../errors';
import type {
  CreateCheckoutResult,
  CreateSubscriptionResult,
  GatewayConfig,
  NormalizedPaymentEvent,
  PaymentGateway,
  PaymentGatewayDefinition,
  RefundResult,
} from '../types';
import { headerValue } from '../utils';

const credentialsSchema = z.object({
  secretKey: z.string().min(1),
  webhookSecret: z.string().min(1).optional().or(z.literal('')),
  publishableKey: z.string().optional().or(z.literal('')),
});

function createStripeGateway(config: GatewayConfig): PaymentGateway {
  const parsed = credentialsSchema.parse(config.credentials);
  const stripe = new Stripe(parsed.secretKey);

  return {
    id: 'stripe',
    label: 'Stripe',
    capabilities: {
      oneTime: true,
      refunds: true,
      webhooks: true,
      subscriptions: true,
    },

    async createCheckout(
      input: CreatePaymentInput & { paymentId: string },
    ): Promise<CreateCheckoutResult> {
      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        success_url: input.successUrl,
        cancel_url: input.cancelUrl,
        customer_email: input.customer?.email,
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: input.currency.toLowerCase(),
              unit_amount: input.amount,
              product_data: {
                name: input.description || `Payment ${input.paymentId}`,
              },
            },
          },
        ],
        metadata: {
          paymentId: input.paymentId,
          referenceType: input.reference.type,
          referenceId: input.reference.id,
          ...input.metadata,
        },
        payment_intent_data: {
          metadata: {
            paymentId: input.paymentId,
            referenceType: input.reference.type,
            referenceId: input.reference.id,
          },
        },
      });

      return {
        checkoutUrl: session.url ?? undefined,
        gatewayPaymentId: session.id,
        clientSecret: typeof session.client_secret === 'string' ? session.client_secret : undefined,
        raw: session,
      };
    },

    async refund(input: {
      gatewayPaymentId: string;
      amount?: number;
      reason?: string;
    }): Promise<RefundResult> {
      let paymentIntentId = input.gatewayPaymentId;

      if (paymentIntentId.startsWith('cs_')) {
        const session = await stripe.checkout.sessions.retrieve(paymentIntentId);
        if (typeof session.payment_intent === 'string') {
          paymentIntentId = session.payment_intent;
        } else if (session.payment_intent && typeof session.payment_intent === 'object') {
          paymentIntentId = session.payment_intent.id;
        } else {
          throw new Error('Stripe checkout session has no payment intent to refund');
        }
      }

      const refund = await stripe.refunds.create({
        payment_intent: paymentIntentId,
        amount: input.amount,
        reason: input.reason ? 'requested_by_customer' : undefined,
      });

      return { gatewayRefundId: refund.id, raw: refund };
    },

    async verifyWebhook(req: {
      headers: Headers | Record<string, string | string[] | undefined>;
      rawBody: string;
    }): Promise<NormalizedPaymentEvent> {
      const signature = headerValue(req.headers, 'stripe-signature');
      if (!signature || !parsed.webhookSecret) {
        throw new WebhookVerificationError('Missing Stripe webhook secret or signature');
      }

      let event: Stripe.Event;
      try {
        event = stripe.webhooks.constructEvent(req.rawBody, signature, parsed.webhookSecret);
      } catch (err) {
        throw new WebhookVerificationError(
          err instanceof Error ? err.message : 'Invalid Stripe webhook signature',
        );
      }

      const base = {
        eventId: event.id,
        raw: event,
      };

      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object as Stripe.Checkout.Session;
          return {
            ...base,
            type: session.payment_status === 'paid' ? 'payment.succeeded' : 'payment.succeeded',
            gatewayPaymentId: session.id,
            paymentId: session.metadata?.paymentId,
            amount: session.amount_total ?? undefined,
            currency: session.currency?.toUpperCase(),
            status: session.payment_status ?? undefined,
          };
        }
        case 'payment_intent.succeeded': {
          const pi = event.data.object as Stripe.PaymentIntent;
          return {
            ...base,
            type: 'payment.succeeded',
            gatewayPaymentId: pi.id,
            paymentId: pi.metadata?.paymentId,
            amount: pi.amount,
            currency: pi.currency.toUpperCase(),
            status: pi.status,
          };
        }
        case 'payment_intent.payment_failed': {
          const pi = event.data.object as Stripe.PaymentIntent;
          return {
            ...base,
            type: 'payment.failed',
            gatewayPaymentId: pi.id,
            paymentId: pi.metadata?.paymentId,
            amount: pi.amount,
            currency: pi.currency.toUpperCase(),
            status: pi.status,
          };
        }
        case 'charge.refunded': {
          const charge = event.data.object as Stripe.Charge;
          return {
            ...base,
            type: 'payment.refunded',
            gatewayPaymentId:
              typeof charge.payment_intent === 'string'
                ? charge.payment_intent
                : charge.payment_intent?.id,
            amount: charge.amount_refunded,
            currency: charge.currency.toUpperCase(),
          };
        }
        case 'customer.subscription.updated':
        case 'customer.subscription.deleted': {
          const sub = event.data.object as Stripe.Subscription;
          return {
            ...base,
            type:
              event.type === 'customer.subscription.deleted'
                ? 'subscription.cancelled'
                : 'subscription.updated',
            gatewaySubscriptionId: sub.id,
            status: sub.status,
          };
        }
        default:
          return { ...base, type: 'unknown' };
      }
    },

    async createSubscription(
      input: CreateSubscriptionInput & { subscriptionId: string },
    ): Promise<CreateSubscriptionResult> {
      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        success_url: input.successUrl,
        cancel_url: input.cancelUrl,
        customer_email: input.customer?.email,
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: input.currency.toLowerCase(),
              unit_amount: input.amount,
              recurring: {
                interval: input.interval,
                interval_count: input.intervalCount,
              },
              product_data: {
                name: input.description || `Subscription ${input.subscriptionId}`,
              },
            },
          },
        ],
        subscription_data: {
          trial_period_days: input.trialDays || undefined,
          metadata: {
            subscriptionId: input.subscriptionId,
            referenceType: input.reference.type,
            referenceId: input.reference.id,
            ...input.metadata,
          },
        },
        metadata: {
          subscriptionId: input.subscriptionId,
          referenceType: input.reference.type,
          referenceId: input.reference.id,
        },
      });

      return {
        checkoutUrl: session.url ?? undefined,
        gatewaySubscriptionId: session.id,
        clientSecret:
          typeof session.client_secret === 'string' ? session.client_secret : undefined,
        raw: session,
      };
    },

    async cancelSubscription(input: { gatewaySubscriptionId: string }): Promise<void> {
      let subscriptionId = input.gatewaySubscriptionId;
      if (subscriptionId.startsWith('cs_')) {
        const session = await stripe.checkout.sessions.retrieve(subscriptionId);
        if (typeof session.subscription === 'string') {
          subscriptionId = session.subscription;
        } else if (session.subscription && typeof session.subscription === 'object') {
          subscriptionId = session.subscription.id;
        } else {
          throw new CapabilityNotSupportedError('stripe', 'cancel without subscription id');
        }
      }
      await stripe.subscriptions.cancel(subscriptionId);
    },
  };
}

export const stripeGatewayDefinition: PaymentGatewayDefinition = {
  id: 'stripe',
  label: 'Stripe',
  description: 'Global payments with Checkout Sessions and subscriptions',
  region: 'Global',
  ready: true,
  capabilities: {
    oneTime: true,
    refunds: true,
    webhooks: true,
    subscriptions: true,
  },
  credentialFields: [
    { key: 'secretKey', label: 'Secret key', secret: true, required: true },
    { key: 'publishableKey', label: 'Publishable key', secret: false },
    { key: 'webhookSecret', label: 'Webhook signing secret', secret: true },
  ],
  credentialsSchema: credentialsSchema,
  create: createStripeGateway,
};

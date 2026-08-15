import { z } from 'zod';
import { GatewayNotReadyError } from '../errors';
import type {
  GatewayCapabilities,
  GatewayConfig,
  PaymentGateway,
  PaymentGatewayDefinition,
  CredentialFieldMeta,
} from '../types';

function stubGateway(
  id: string,
  label: string,
  config: GatewayConfig,
): PaymentGateway {
  void config;
  const notReady = () => {
    throw new GatewayNotReadyError(id);
  };
  return {
    id,
    label,
    capabilities: {
      oneTime: true,
      refunds: true,
      webhooks: true,
      subscriptions: false,
    },
    createCheckout: notReady,
    refund: notReady,
    verifyWebhook: notReady,
  };
}

function defineStub(opts: {
  id: string;
  label: string;
  description: string;
  region: string;
  capabilities?: Partial<GatewayCapabilities>;
  credentialFields: CredentialFieldMeta[];
  credentialsSchema: z.ZodType<Record<string, string>>;
}): PaymentGatewayDefinition {
  const capabilities: GatewayCapabilities = {
    oneTime: true,
    refunds: true,
    webhooks: true,
    subscriptions: false,
    ...opts.capabilities,
  };
  return {
    id: opts.id,
    label: opts.label,
    description: opts.description,
    region: opts.region,
    ready: false,
    capabilities,
    credentialFields: opts.credentialFields,
    credentialsSchema: opts.credentialsSchema,
    create: (config) => stubGateway(opts.id, opts.label, config),
  };
}

export const paypalGatewayDefinition = defineStub({
  id: 'paypal',
  label: 'PayPal',
  description: 'Global PayPal Checkout (adapter pending — community contributions welcome)',
  region: 'Global',
  capabilities: { subscriptions: true },
  credentialFields: [
    { key: 'clientId', label: 'Client ID', required: true },
    { key: 'clientSecret', label: 'Client secret', secret: true, required: true },
    { key: 'webhookId', label: 'Webhook ID', secret: false },
  ],
  credentialsSchema: z.object({
    clientId: z.string().min(1),
    clientSecret: z.string().min(1),
    webhookId: z.string().optional().or(z.literal('')),
  }),
});

export const cashfreeGatewayDefinition = defineStub({
  id: 'cashfree',
  label: 'Cashfree',
  description: 'India payments via Cashfree (adapter pending)',
  region: 'India',
  credentialFields: [
    { key: 'appId', label: 'App ID', required: true },
    { key: 'secretKey', label: 'Secret key', secret: true, required: true },
    { key: 'webhookSecret', label: 'Webhook secret', secret: true },
  ],
  credentialsSchema: z.object({
    appId: z.string().min(1),
    secretKey: z.string().min(1),
    webhookSecret: z.string().optional().or(z.literal('')),
  }),
});

export const phonepeGatewayDefinition = defineStub({
  id: 'phonepe',
  label: 'PhonePe',
  description: 'India PhonePe Payment Gateway (adapter pending)',
  region: 'India',
  credentialFields: [
    { key: 'merchantId', label: 'Merchant ID', required: true },
    { key: 'saltKey', label: 'Salt key', secret: true, required: true },
    { key: 'saltIndex', label: 'Salt index', required: true },
  ],
  credentialsSchema: z.object({
    merchantId: z.string().min(1),
    saltKey: z.string().min(1),
    saltIndex: z.string().min(1),
  }),
});

export const payuGatewayDefinition = defineStub({
  id: 'payu',
  label: 'PayU',
  description: 'India / LATAM PayU (adapter pending)',
  region: 'India / LATAM',
  capabilities: { subscriptions: true },
  credentialFields: [
    { key: 'merchantKey', label: 'Merchant key', required: true },
    { key: 'merchantSalt', label: 'Merchant salt', secret: true, required: true },
    { key: 'authHeader', label: 'Auth header (optional)', secret: true },
  ],
  credentialsSchema: z.object({
    merchantKey: z.string().min(1),
    merchantSalt: z.string().min(1),
    authHeader: z.string().optional().or(z.literal('')),
  }),
});

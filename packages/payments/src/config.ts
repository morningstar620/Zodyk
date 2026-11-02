import { decrypt, encrypt } from '@zodyk/auth/security/encryption';
import { DEFAULT_TENANT_ID, type PaymentMode } from '@zodyk/core';
import { connectDatabase, getModels } from '@zodyk/database';
import { GatewayNotConfiguredError, GatewayNotFoundError, PaymentsError } from './errors';
import { registerBuiltinGateways } from './gateways';
import { createPaymentGateway, getPaymentGatewayDefinition, listPaymentGateways } from './registry';
import type { GatewayConfig, GatewayId, PaymentGateway } from './types';
import { maskSecret } from './utils';

registerBuiltinGateways();

export interface ResolvedPaymentsConfig {
  activeGateway: GatewayId;
  mode: PaymentMode;
  credentials: Record<string, string>;
  source: 'env' | 'db';
}

let cachedConfig: ResolvedPaymentsConfig | null | undefined;

const SECRET_FIELD_HINTS = [
  'secret',
  'password',
  'salt',
  'token',
  'webhook',
  'signing',
  'apiKey',
  'keySecret',
];

function isSecretField(key: string): boolean {
  const lower = key.toLowerCase();
  return SECRET_FIELD_HINTS.some((hint) => lower.includes(hint.toLowerCase()));
}

function envCredentialsFor(gateway: string): Record<string, string> | null {
  switch (gateway) {
    case 'stripe': {
      const secretKey = process.env.STRIPE_SECRET_KEY;
      if (!secretKey) return null;
      return {
        secretKey,
        publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
        webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
      };
    }
    case 'razorpay': {
      const keyId = process.env.RAZORPAY_KEY_ID;
      const keySecret = process.env.RAZORPAY_KEY_SECRET;
      if (!keyId || !keySecret) return null;
      return {
        keyId,
        keySecret,
        webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || '',
      };
    }
    case 'custom': {
      const createCheckoutUrl = process.env.PAYMENTS_CUSTOM_CHECKOUT_URL;
      const webhookSecret = process.env.PAYMENTS_CUSTOM_WEBHOOK_SECRET;
      if (!createCheckoutUrl || !webhookSecret) return null;
      return {
        createCheckoutUrl,
        refundUrl: process.env.PAYMENTS_CUSTOM_REFUND_URL || '',
        webhookSecret,
        apiKey: process.env.PAYMENTS_CUSTOM_API_KEY || '',
      };
    }
    case 'paypal': {
      const clientId = process.env.PAYPAL_CLIENT_ID;
      const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
      if (!clientId || !clientSecret) return null;
      return {
        clientId,
        clientSecret,
        webhookId: process.env.PAYPAL_WEBHOOK_ID || '',
      };
    }
    case 'cashfree': {
      const appId = process.env.CASHFREE_APP_ID;
      const secretKey = process.env.CASHFREE_SECRET_KEY;
      if (!appId || !secretKey) return null;
      return {
        appId,
        secretKey,
        webhookSecret: process.env.CASHFREE_WEBHOOK_SECRET || '',
      };
    }
    case 'phonepe': {
      const merchantId = process.env.PHONEPE_MERCHANT_ID;
      const saltKey = process.env.PHONEPE_SALT_KEY;
      const saltIndex = process.env.PHONEPE_SALT_INDEX;
      if (!merchantId || !saltKey || !saltIndex) return null;
      return { merchantId, saltKey, saltIndex };
    }
    case 'payu': {
      const merchantKey = process.env.PAYU_MERCHANT_KEY;
      const merchantSalt = process.env.PAYU_MERCHANT_SALT;
      if (!merchantKey || !merchantSalt) return null;
      return {
        merchantKey,
        merchantSalt,
        authHeader: process.env.PAYU_AUTH_HEADER || '',
      };
    }
    default:
      return null;
  }
}

function envConfig(): ResolvedPaymentsConfig | null {
  const activeGateway = process.env.PAYMENTS_GATEWAY?.trim().toLowerCase();
  if (!activeGateway) return null;
  const credentials = envCredentialsFor(activeGateway);
  if (!credentials) return null;
  const mode = (
    process.env.PAYMENTS_MODE?.trim().toLowerCase() === 'live' ? 'live' : 'test'
  ) as PaymentMode;
  return { activeGateway, mode, credentials, source: 'env' };
}

async function dbConfig(): Promise<ResolvedPaymentsConfig | null> {
  const uri = process.env.MONGODB_URI;
  if (!uri) return null;

  await connectDatabase(uri);
  const { PlatformSettings } = getModels();
  const settings = await PlatformSettings.findOne({ tenantId: DEFAULT_TENANT_ID }).lean();
  const payments = settings?.payments;
  if (!payments?.activeGateway) return null;

  const gatewayStore = payments.gateways
    ? payments.gateways instanceof Map
      ? payments.gateways.get(payments.activeGateway)
      : (
          payments.gateways as Record<
            string,
            {
              secretsEncrypted?: string;
              publicFields?: Record<string, string> | Map<string, string>;
              configured?: boolean;
            }
          >
        )[payments.activeGateway]
    : undefined;

  if (!gatewayStore?.configured && !gatewayStore?.secretsEncrypted && !gatewayStore?.publicFields) {
    return null;
  }

  let secrets: Record<string, string> = {};
  if (gatewayStore.secretsEncrypted) {
    try {
      secrets = JSON.parse(decrypt(gatewayStore.secretsEncrypted)) as Record<string, string>;
    } catch {
      return null;
    }
  }

  const publicFieldsRaw = gatewayStore.publicFields;
  const publicFields =
    publicFieldsRaw instanceof Map
      ? Object.fromEntries(publicFieldsRaw.entries())
      : { ...(publicFieldsRaw || {}) };

  return {
    activeGateway: payments.activeGateway,
    mode: payments.mode || 'test',
    credentials: { ...publicFields, ...secrets },
    source: 'db',
  };
}

export async function getPaymentsConfig(): Promise<ResolvedPaymentsConfig | null> {
  if (cachedConfig !== undefined) return cachedConfig;
  const fromEnv = envConfig();
  if (fromEnv) {
    cachedConfig = fromEnv;
    return fromEnv;
  }
  const fromDb = await dbConfig();
  cachedConfig = fromDb;
  return fromDb;
}

export function clearPaymentsConfigCache(): void {
  cachedConfig = undefined;
}

export async function requirePaymentsConfig(gatewayId?: string): Promise<ResolvedPaymentsConfig> {
  const config = await getPaymentsConfig();
  if (!config) throw new GatewayNotConfiguredError(gatewayId);
  if (gatewayId && config.activeGateway !== gatewayId) {
    // Allow explicit gateway override if that gateway has credentials in env/db
    const override = await resolveGatewayCredentials(gatewayId, config.mode);
    if (!override) throw new GatewayNotConfiguredError(gatewayId);
    return {
      activeGateway: gatewayId,
      mode: config.mode,
      credentials: override.credentials,
      source: override.source,
    };
  }
  return config;
}

async function resolveGatewayCredentials(
  gatewayId: string,
  mode: PaymentMode,
): Promise<{ credentials: Record<string, string>; source: 'env' | 'db' } | null> {
  const fromEnv = envCredentialsFor(gatewayId);
  if (fromEnv) return { credentials: fromEnv, source: 'env' };

  const uri = process.env.MONGODB_URI;
  if (!uri) return null;
  await connectDatabase(uri);
  const { PlatformSettings } = getModels();
  const settings = await PlatformSettings.findOne({ tenantId: DEFAULT_TENANT_ID }).lean();
  const store = settings?.payments?.gateways
    ? settings.payments.gateways instanceof Map
      ? settings.payments.gateways.get(gatewayId)
      : (
          settings.payments.gateways as Record<
            string,
            {
              secretsEncrypted?: string;
              publicFields?: Record<string, string> | Map<string, string>;
            }
          >
        )[gatewayId]
    : undefined;
  if (!store) return null;

  let secrets: Record<string, string> = {};
  if (store.secretsEncrypted) {
    try {
      secrets = JSON.parse(decrypt(store.secretsEncrypted)) as Record<string, string>;
    } catch {
      return null;
    }
  }
  const publicFieldsRaw = store.publicFields;
  const publicFields =
    publicFieldsRaw instanceof Map
      ? Object.fromEntries(publicFieldsRaw.entries())
      : { ...(publicFieldsRaw || {}) };
  void mode;
  return { credentials: { ...publicFields, ...secrets }, source: 'db' };
}

export async function getActivePaymentGateway(
  gatewayId?: string,
): Promise<{ gateway: PaymentGateway; config: ResolvedPaymentsConfig }> {
  const config = await requirePaymentsConfig(gatewayId);
  const id = gatewayId || config.activeGateway;
  const definition = getPaymentGatewayDefinition(id);
  if (!definition) throw new GatewayNotFoundError(id);

  const gatewayConfig: GatewayConfig = {
    mode: config.mode,
    credentials:
      config.activeGateway === id
        ? config.credentials
        : (await resolveGatewayCredentials(id, config.mode))?.credentials || config.credentials,
  };

  if (gatewayId && gatewayId !== config.activeGateway) {
    const resolved = await resolveGatewayCredentials(gatewayId, config.mode);
    if (!resolved) throw new GatewayNotConfiguredError(gatewayId);
    gatewayConfig.credentials = resolved.credentials;
  }

  return {
    gateway: createPaymentGateway(id, gatewayConfig),
    config: { ...config, activeGateway: id, credentials: gatewayConfig.credentials },
  };
}

export function encryptGatewayCredentials(
  credentials: Record<string, string>,
  definitionId: string,
): { secretsEncrypted?: string; publicFields: Record<string, string> } {
  const definition = getPaymentGatewayDefinition(definitionId);
  const secretKeys = new Set(
    (definition?.credentialFields || []).filter((f) => f.secret).map((f) => f.key),
  );

  const secrets: Record<string, string> = {};
  const publicFields: Record<string, string> = {};

  for (const [key, value] of Object.entries(credentials)) {
    if (!value) continue;
    if (secretKeys.has(key) || isSecretField(key)) {
      secrets[key] = value;
    } else {
      publicFields[key] = value;
    }
  }

  return {
    secretsEncrypted:
      Object.keys(secrets).length > 0 ? encrypt(JSON.stringify(secrets)) : undefined,
    publicFields,
  };
}

export async function savePaymentsSettings(input: {
  activeGateway?: string;
  mode?: PaymentMode;
  gateway: string;
  credentials?: Record<string, string>;
}): Promise<void> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is required');
  await connectDatabase(uri);
  const { PlatformSettings } = getModels();

  const definition = getPaymentGatewayDefinition(input.gateway);
  if (!definition) throw new GatewayNotFoundError(input.gateway);

  const existing = await PlatformSettings.findOne({ tenantId: DEFAULT_TENANT_ID });
  const existingPayments = existing?.payments;
  const existingStore = existingPayments?.gateways
    ? existingPayments.gateways instanceof Map
      ? existingPayments.gateways.get(input.gateway)
      : (
          existingPayments.gateways as Record<
            string,
            {
              secretsEncrypted?: string;
              publicFields?: Map<string, string> | Record<string, string>;
            }
          >
        )[input.gateway]
    : undefined;

  let secrets: Record<string, string> = {};
  if (existingStore?.secretsEncrypted) {
    try {
      secrets = JSON.parse(decrypt(existingStore.secretsEncrypted)) as Record<string, string>;
    } catch {
      secrets = {};
    }
  }

  const incoming = input.credentials || {};
  for (const [key, value] of Object.entries(incoming)) {
    if (value === undefined || value === null) continue;
    const str = String(value);
    if (!str || str.includes('*')) continue; // skip masked placeholders
    secrets[key] = str;
  }

  // Merge: re-split into public/secret using definition
  const allCredentials = { ...secrets };
  if (existingStore?.publicFields) {
    const pf =
      existingStore.publicFields instanceof Map
        ? Object.fromEntries(existingStore.publicFields.entries())
        : existingStore.publicFields;
    for (const [k, v] of Object.entries(pf)) {
      if (!(k in allCredentials)) allCredentials[k] = String(v);
    }
  }
  for (const [key, value] of Object.entries(incoming)) {
    const str = String(value ?? '');
    if (!str || str.includes('*')) continue;
    allCredentials[key] = str;
  }

  const { secretsEncrypted, publicFields } = encryptGatewayCredentials(
    allCredentials,
    input.gateway,
  );

  const mode = input.mode || existingPayments?.mode || 'test';
  const activeGateway = input.activeGateway || existingPayments?.activeGateway || input.gateway;
  const activeDefinition = getPaymentGatewayDefinition(activeGateway);
  if (!activeDefinition) throw new GatewayNotFoundError(activeGateway);
  if (!activeDefinition.ready) {
    throw new PaymentsError(
      `Payment gateway "${activeGateway}" is not implemented and cannot be set as the active gateway.`,
      'GATEWAY_NOT_READY',
      400,
    );
  }

  await PlatformSettings.findOneAndUpdate(
    { tenantId: DEFAULT_TENANT_ID },
    {
      $set: {
        'payments.activeGateway': activeGateway,
        'payments.mode': mode,
        [`payments.gateways.${input.gateway}`]: {
          secretsEncrypted,
          publicFields,
          configured: true,
        },
      },
    },
    { upsert: true, new: true },
  );

  clearPaymentsConfigCache();
}

export async function getPaymentsSettingsPublic() {
  const env = envConfig();
  const gateways = listPaymentGateways().map((g) => ({
    id: g.id,
    label: g.label,
    description: g.description,
    region: g.region,
    ready: g.ready,
    capabilities: g.capabilities,
    credentialFields: g.credentialFields.map((f) => ({
      key: f.key,
      label: f.label,
      secret: Boolean(f.secret),
      required: Boolean(f.required),
      placeholder: f.placeholder,
    })),
  }));

  if (env) {
    return {
      configured: true,
      source: 'env' as const,
      readOnly: true,
      activeGateway: env.activeGateway,
      mode: env.mode,
      gateways,
      credentials: Object.fromEntries(
        Object.entries(env.credentials).map(([k, v]) => [k, isSecretField(k) ? maskSecret(v) : v]),
      ),
    };
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    return {
      configured: false,
      source: null,
      readOnly: false,
      activeGateway: null,
      mode: 'test' as const,
      gateways,
      credentials: {},
    };
  }

  await connectDatabase(uri);
  const { PlatformSettings } = getModels();
  const doc = await PlatformSettings.findOne({ tenantId: DEFAULT_TENANT_ID }).lean();
  const payments = doc?.payments;
  const activeGateway = payments?.activeGateway || null;

  let credentials: Record<string, string> = {};
  if (activeGateway && payments?.gateways) {
    const store =
      payments.gateways instanceof Map
        ? payments.gateways.get(activeGateway)
        : (
            payments.gateways as Record<
              string,
              {
                secretsEncrypted?: string;
                publicFields?: Record<string, string> | Map<string, string>;
              }
            >
          )[activeGateway];
    if (store) {
      const publicFields =
        store.publicFields instanceof Map
          ? Object.fromEntries(store.publicFields.entries())
          : { ...(store.publicFields || {}) };
      credentials = { ...publicFields };
      if (store.secretsEncrypted) {
        try {
          const secrets = JSON.parse(decrypt(store.secretsEncrypted)) as Record<string, string>;
          for (const [k, v] of Object.entries(secrets)) {
            credentials[k] = maskSecret(v);
          }
        } catch {
          // ignore
        }
      }
    }
  }

  return {
    configured: Boolean(activeGateway),
    source: activeGateway ? ('db' as const) : null,
    readOnly: false,
    activeGateway,
    mode: payments?.mode || 'test',
    gateways,
    credentials,
  };
}

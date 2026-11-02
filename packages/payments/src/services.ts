import {
  DEFAULT_TENANT_ID,
  createPaymentSchema,
  createSubscriptionSchema,
  paymentEventListQuerySchema,
  paymentListQuerySchema,
  refundPaymentSchema,
  subscriptionListQuerySchema,
  type CreatePaymentInput,
  type CreateSubscriptionInput,
  type PaymentEventListQuery,
  type PaymentListQuery,
  type RefundPaymentInput,
  type SubscriptionListQuery,
  type SubscriptionStatus,
} from '@zodyk/core';
import type { IPayment, IPaymentEvent, ISubscriptionIntent } from '@zodyk/database';
import { getActivePaymentGateway } from './config';
import { ensureDb } from './db';
import { CapabilityNotSupportedError, PaymentNotFoundError, PaymentsError } from './errors';
import { isObjectId, metadataToRecord } from './utils';
import type { NormalizedPaymentEvent } from './types';

const CONFIRMED_SUBSCRIPTION_STATUSES = [
  'trialing',
  'active',
  'past_due',
  'paused',
  'cancelled',
] as const satisfies readonly SubscriptionStatus[];

function serializePayment(doc: IPayment) {
  return {
    id: String(doc._id),
    tenantId: doc.tenantId,
    amount: doc.amount,
    currency: doc.currency,
    status: doc.status,
    reference: { type: doc.referenceType, id: doc.referenceId },
    gateway: doc.gateway,
    gatewayPaymentId: doc.gatewayPaymentId,
    checkoutUrl: doc.checkoutUrl,
    clientSecret: doc.clientSecret,
    customer: doc.customer,
    description: doc.description,
    metadata: metadataToRecord(doc.metadata as Record<string, string> | Map<string, string>),
    idempotencyKey: doc.idempotencyKey,
    refundedAmount: doc.refundedAmount,
    paidAt: doc.paidAt,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

function serializeSubscription(doc: ISubscriptionIntent) {
  return {
    id: String(doc._id),
    tenantId: doc.tenantId,
    amount: doc.amount,
    currency: doc.currency,
    interval: doc.interval,
    intervalCount: doc.intervalCount,
    trialDays: doc.trialDays,
    status: doc.status,
    reference: { type: doc.referenceType, id: doc.referenceId },
    gateway: doc.gateway,
    gatewaySubscriptionId: doc.gatewaySubscriptionId,
    checkoutUrl: doc.checkoutUrl,
    clientSecret: doc.clientSecret,
    customer: doc.customer,
    description: doc.description,
    metadata: metadataToRecord(doc.metadata as Record<string, string> | Map<string, string>),
    cancelAtPeriodEnd: doc.cancelAtPeriodEnd,
    currentPeriodStart: doc.currentPeriodStart,
    currentPeriodEnd: doc.currentPeriodEnd,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

function serializePaymentEvent(doc: IPaymentEvent) {
  return {
    id: String(doc._id),
    gateway: doc.gateway,
    eventId: doc.eventId,
    type: doc.type,
    paymentId: doc.paymentId ? String(doc.paymentId) : undefined,
    payload: doc.payload,
    processed: Boolean(doc.processedAt),
    processedAt: doc.processedAt,
    error: doc.error,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

function isDuplicateKeyError(err: unknown): boolean {
  return Boolean(
    err && typeof err === 'object' && 'code' in err && (err as { code?: number }).code === 11000,
  );
}

function jsonPayload(raw: unknown): Record<string, unknown> {
  try {
    const parsed = JSON.parse(JSON.stringify(raw)) as unknown;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // Fall through to a marker the inspector can still show.
  }
  return { unserializable: true };
}

function confirmedSubscriptionStatus(status: string | undefined): SubscriptionStatus | undefined {
  if (!status) return undefined;
  return (CONFIRMED_SUBSCRIPTION_STATUSES as readonly string[]).includes(status)
    ? (status as SubscriptionStatus)
    : undefined;
}

function nextGatewaySubscriptionId(current: string | undefined, incoming: string | undefined) {
  if (!incoming) return current;
  if (!current) return incoming;
  if (incoming.startsWith('cs_') && !current.startsWith('cs_')) return current;
  return incoming;
}

export async function createPayment(input: CreatePaymentInput) {
  const parsed = createPaymentSchema.parse(input);
  const { Payment } = await ensureDb();

  if (parsed.idempotencyKey) {
    const existing = await Payment.findOne({
      tenantId: DEFAULT_TENANT_ID,
      idempotencyKey: parsed.idempotencyKey,
    });
    if (existing) return serializePayment(existing);
  }

  const { gateway, config } = await getActivePaymentGateway(parsed.gateway);

  const doc = await Payment.create({
    tenantId: DEFAULT_TENANT_ID,
    amount: parsed.amount,
    currency: parsed.currency,
    status: 'pending',
    referenceType: parsed.reference.type,
    referenceId: parsed.reference.id,
    gateway: config.activeGateway,
    customer: parsed.customer,
    description: parsed.description,
    metadata: parsed.metadata,
    idempotencyKey: parsed.idempotencyKey,
    refundedAmount: 0,
  });

  try {
    const result = await gateway.createCheckout({
      ...parsed,
      paymentId: String(doc._id),
    });

    doc.gatewayPaymentId = result.gatewayPaymentId;
    doc.checkoutUrl = result.checkoutUrl;
    doc.clientSecret = result.clientSecret;
    if (result.clientSecret && !result.checkoutUrl) {
      doc.status = 'requires_action';
    }
    await doc.save();
  } catch (err) {
    doc.status = 'failed';
    await doc.save();
    throw err;
  }

  return serializePayment(doc);
}

export async function getPayment(id: string) {
  const { Payment } = await ensureDb();
  const doc = await Payment.findOne({ _id: id, tenantId: DEFAULT_TENANT_ID });
  if (!doc) throw new PaymentNotFoundError(id);
  return serializePayment(doc);
}

export async function listPayments(query: Partial<PaymentListQuery> = {}) {
  const parsed = paymentListQuerySchema.parse(query);
  const { Payment } = await ensureDb();

  const filter: Record<string, unknown> = { tenantId: DEFAULT_TENANT_ID };
  if (parsed.status) filter.status = parsed.status;
  if (parsed.referenceType) filter.referenceType = parsed.referenceType;
  if (parsed.referenceId) filter.referenceId = parsed.referenceId;
  if (parsed.gateway) filter.gateway = parsed.gateway;

  const skip = (parsed.page - 1) * parsed.limit;
  const [items, total] = await Promise.all([
    Payment.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parsed.limit),
    Payment.countDocuments(filter),
  ]);

  return {
    items: items.map(serializePayment),
    page: parsed.page,
    limit: parsed.limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / parsed.limit)),
  };
}

export async function refundPayment(id: string, input: RefundPaymentInput = {}) {
  const parsed = refundPaymentSchema.parse(input);
  const { Payment } = await ensureDb();
  const doc = await Payment.findOne({ _id: id, tenantId: DEFAULT_TENANT_ID });
  if (!doc) throw new PaymentNotFoundError(id);

  if (doc.status !== 'paid' && doc.status !== 'partially_refunded') {
    throw new PaymentsError(
      `Cannot refund payment in status "${doc.status}"`,
      'INVALID_PAYMENT_STATUS',
      400,
    );
  }
  if (!doc.gatewayPaymentId) {
    throw new PaymentsError('Payment has no gateway payment id', 'MISSING_GATEWAY_ID', 400);
  }

  const refundAmount = parsed.amount ?? doc.amount - doc.refundedAmount;
  if (refundAmount <= 0 || doc.refundedAmount + refundAmount > doc.amount) {
    throw new PaymentsError('Invalid refund amount', 'INVALID_REFUND_AMOUNT', 400);
  }

  const { gateway } = await getActivePaymentGateway(doc.gateway);
  if (!gateway.capabilities.refunds) {
    throw new CapabilityNotSupportedError(doc.gateway, 'refunds');
  }

  const result = await gateway.refund({
    gatewayPaymentId: doc.gatewayPaymentId,
    amount: refundAmount,
    reason: parsed.reason,
  });

  doc.refundedAmount += refundAmount;
  doc.status = doc.refundedAmount >= doc.amount ? 'refunded' : 'partially_refunded';
  await doc.save();

  return {
    payment: serializePayment(doc),
    gatewayRefundId: result.gatewayRefundId,
  };
}

export async function handleWebhook(
  gatewayId: string,
  req: {
    headers: Headers | Record<string, string | string[] | undefined>;
    rawBody: string;
  },
) {
  const { gateway } = await getActivePaymentGateway(gatewayId);
  const event = await gateway.verifyWebhook(req);
  return applyPaymentEvent(gatewayId, event);
}

async function findSubscriptionForEvent(gatewayId: string, event: NormalizedPaymentEvent) {
  const { SubscriptionIntent } = await ensureDb();
  if (event.subscriptionId && isObjectId(event.subscriptionId)) {
    const byId = await SubscriptionIntent.findOne({
      _id: event.subscriptionId,
      tenantId: DEFAULT_TENANT_ID,
      gateway: gatewayId,
    });
    if (byId) return byId;
  }
  if (!event.gatewaySubscriptionId) return null;
  return SubscriptionIntent.findOne({
    tenantId: DEFAULT_TENANT_ID,
    gateway: gatewayId,
    gatewaySubscriptionId: event.gatewaySubscriptionId,
  });
}

async function applyEventEffects(gatewayId: string, event: NormalizedPaymentEvent) {
  const { Payment } = await ensureDb();
  let payment: IPayment | null = null;
  if (event.paymentId && isObjectId(event.paymentId)) {
    payment = await Payment.findOne({
      _id: event.paymentId,
      tenantId: DEFAULT_TENANT_ID,
    });
  }
  if (!payment && event.gatewayPaymentId) {
    payment = await Payment.findOne({
      tenantId: DEFAULT_TENANT_ID,
      gateway: gatewayId,
      gatewayPaymentId: event.gatewayPaymentId,
    });
  }

  if (payment) {
    if (event.type === 'payment.succeeded') {
      payment.status = 'paid';
      payment.paidAt = payment.paidAt || new Date();
      if (event.gatewayPaymentId) payment.gatewayPaymentId = event.gatewayPaymentId;
      await payment.save();
    } else if (event.type === 'payment.failed') {
      payment.status = 'failed';
      await payment.save();
    } else if (event.type === 'payment.cancelled') {
      payment.status = 'cancelled';
      await payment.save();
    } else if (event.type === 'payment.refunded') {
      const refunded = event.amount ?? payment.amount;
      payment.refundedAmount = Math.min(payment.amount, Math.max(payment.refundedAmount, refunded));
      payment.status = payment.refundedAmount >= payment.amount ? 'refunded' : 'partially_refunded';
      await payment.save();
    }
  }

  let subscription: ISubscriptionIntent | null = null;
  if (event.type.startsWith('subscription.')) {
    subscription = await findSubscriptionForEvent(gatewayId, event);
    if (subscription) {
      const gatewaySubscriptionId = nextGatewaySubscriptionId(
        subscription.gatewaySubscriptionId,
        event.gatewaySubscriptionId,
      );
      if (gatewaySubscriptionId) subscription.gatewaySubscriptionId = gatewaySubscriptionId;
      if (event.currentPeriodStart) subscription.currentPeriodStart = event.currentPeriodStart;
      if (event.currentPeriodEnd) subscription.currentPeriodEnd = event.currentPeriodEnd;

      if (event.type === 'subscription.cancelled') {
        subscription.status = 'cancelled';
      } else {
        const next = confirmedSubscriptionStatus(event.status);
        if (next && (!event.promotePendingOnly || subscription.status === 'pending')) {
          subscription.status = next;
        }
      }
      await subscription.save();
    }
  }

  return { payment, subscription };
}

export async function applyPaymentEvent(gatewayId: string, event: NormalizedPaymentEvent) {
  const { PaymentEvent } = await ensureDb();
  const identity = {
    tenantId: DEFAULT_TENANT_ID,
    gateway: gatewayId,
    eventId: event.eventId,
  };

  let eventDoc = await PaymentEvent.findOne(identity);
  if (eventDoc?.processedAt) {
    return { duplicate: true as const, event };
  }

  if (!eventDoc) {
    try {
      eventDoc = await PaymentEvent.create({
        ...identity,
        type: event.type,
        payload: jsonPayload(event.raw),
      });
    } catch (err) {
      if (!isDuplicateKeyError(err)) throw err;
      eventDoc = await PaymentEvent.findOne(identity);
      if (!eventDoc) throw err;
      if (eventDoc.processedAt) {
        return { duplicate: true as const, event };
      }
    }
  }

  try {
    const { payment, subscription } = await applyEventEffects(gatewayId, event);
    await PaymentEvent.updateOne(
      { _id: eventDoc._id },
      {
        $set: {
          processedAt: new Date(),
          type: event.type,
          ...(payment ? { paymentId: payment._id } : {}),
        },
        $unset: { error: '' },
      },
    );
    return {
      duplicate: false as const,
      event,
      payment: payment ? serializePayment(payment) : null,
      subscription: subscription ? serializeSubscription(subscription) : null,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Payment event processing failed';
    await PaymentEvent.updateOne(
      { _id: eventDoc._id },
      { $set: { error: message.slice(0, 500) } },
    ).catch(() => undefined);
    throw err;
  }
}

export async function listPaymentEvents(query: Partial<PaymentEventListQuery> = {}) {
  const parsed = paymentEventListQuerySchema.parse(query);
  const { PaymentEvent } = await ensureDb();
  const filter: Record<string, unknown> = { tenantId: DEFAULT_TENANT_ID };
  if (parsed.gateway) filter.gateway = parsed.gateway;
  if (parsed.processed === 'true') filter.processedAt = { $exists: true, $ne: null };
  if (parsed.processed === 'false') filter.processedAt = { $exists: false };

  const skip = (parsed.page - 1) * parsed.limit;
  const [items, total] = await Promise.all([
    PaymentEvent.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parsed.limit),
    PaymentEvent.countDocuments(filter),
  ]);

  return {
    items: items.map(serializePaymentEvent),
    page: parsed.page,
    limit: parsed.limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / parsed.limit)),
  };
}

export async function createSubscription(input: CreateSubscriptionInput) {
  const parsed = createSubscriptionSchema.parse(input);
  const { SubscriptionIntent } = await ensureDb();
  const { gateway, config } = await getActivePaymentGateway(parsed.gateway);

  if (!gateway.capabilities.subscriptions || !gateway.createSubscription) {
    throw new CapabilityNotSupportedError(config.activeGateway, 'subscriptions');
  }

  const doc = await SubscriptionIntent.create({
    tenantId: DEFAULT_TENANT_ID,
    amount: parsed.amount,
    currency: parsed.currency,
    interval: parsed.interval,
    intervalCount: parsed.intervalCount,
    trialDays: parsed.trialDays,
    status: 'pending',
    referenceType: parsed.reference.type,
    referenceId: parsed.reference.id,
    gateway: config.activeGateway,
    customer: parsed.customer,
    description: parsed.description,
    metadata: parsed.metadata,
    cancelAtPeriodEnd: false,
  });

  try {
    const result = await gateway.createSubscription({
      ...parsed,
      subscriptionId: String(doc._id),
    });
    doc.gatewaySubscriptionId = result.gatewaySubscriptionId;
    doc.checkoutUrl = result.checkoutUrl;
    doc.clientSecret = result.clientSecret;
    await doc.save();
  } catch (err) {
    doc.status = 'cancelled';
    await doc.save();
    throw err;
  }

  return serializeSubscription(doc);
}

export async function listSubscriptions(query: Partial<SubscriptionListQuery> = {}) {
  const parsed = subscriptionListQuerySchema.parse(query);
  const { SubscriptionIntent } = await ensureDb();
  const filter: Record<string, unknown> = { tenantId: DEFAULT_TENANT_ID };
  if (parsed.status) filter.status = parsed.status;
  if (parsed.gateway) filter.gateway = parsed.gateway;

  const skip = (parsed.page - 1) * parsed.limit;
  const [items, total] = await Promise.all([
    SubscriptionIntent.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parsed.limit),
    SubscriptionIntent.countDocuments(filter),
  ]);

  return {
    items: items.map(serializeSubscription),
    page: parsed.page,
    limit: parsed.limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / parsed.limit)),
  };
}

export async function getSubscription(id: string) {
  if (!isObjectId(id)) {
    throw new PaymentsError(`Subscription "${id}" was not found.`, 'SUBSCRIPTION_NOT_FOUND', 404);
  }
  const { SubscriptionIntent } = await ensureDb();
  const doc = await SubscriptionIntent.findOne({ _id: id, tenantId: DEFAULT_TENANT_ID });
  if (!doc) {
    throw new PaymentsError(`Subscription "${id}" was not found.`, 'SUBSCRIPTION_NOT_FOUND', 404);
  }
  return serializeSubscription(doc);
}

export async function cancelSubscription(id: string) {
  const { SubscriptionIntent } = await ensureDb();
  const doc = isObjectId(id)
    ? await SubscriptionIntent.findOne({ _id: id, tenantId: DEFAULT_TENANT_ID })
    : null;
  if (!doc) {
    throw new PaymentsError(`Subscription "${id}" was not found.`, 'SUBSCRIPTION_NOT_FOUND', 404);
  }
  if (!doc.gatewaySubscriptionId) {
    throw new PaymentsError(
      'Subscription has no gateway subscription id',
      'MISSING_GATEWAY_ID',
      400,
    );
  }

  const { gateway } = await getActivePaymentGateway(doc.gateway);
  if (!gateway.cancelSubscription) {
    throw new CapabilityNotSupportedError(doc.gateway, 'subscriptions');
  }

  await gateway.cancelSubscription({
    gatewaySubscriptionId: doc.gatewaySubscriptionId,
  });
  doc.status = 'cancelled';
  doc.cancelAtPeriodEnd = false;
  await doc.save();

  return {
    id: String(doc._id),
    status: doc.status,
    gatewaySubscriptionId: doc.gatewaySubscriptionId,
  };
}

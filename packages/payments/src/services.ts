import {
  DEFAULT_TENANT_ID,
  createPaymentSchema,
  createSubscriptionSchema,
  paymentListQuerySchema,
  refundPaymentSchema,
  type CreatePaymentInput,
  type CreateSubscriptionInput,
  type PaymentListQuery,
  type RefundPaymentInput,
} from '@zodyk/core';
import { connectDatabase, getModels, type IPayment } from '@zodyk/database';
import { getActivePaymentGateway } from './config';
import {
  CapabilityNotSupportedError,
  PaymentNotFoundError,
  PaymentsError,
} from './errors';
import { metadataToRecord } from './utils';
import type { NormalizedPaymentEvent } from './types';

async function ensureDb() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is required');
  await connectDatabase(uri);
  return getModels();
}

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

export async function handleWebhook(gatewayId: string, req: {
  headers: Headers | Record<string, string | string[] | undefined>;
  rawBody: string;
}) {
  const { gateway } = await getActivePaymentGateway(gatewayId);
  const event = await gateway.verifyWebhook(req);
  return applyNormalizedEvent(gatewayId, event);
}

async function applyNormalizedEvent(gatewayId: string, event: NormalizedPaymentEvent) {
  const { Payment, PaymentEvent, SubscriptionIntent } = await ensureDb();

  try {
    await PaymentEvent.create({
      tenantId: DEFAULT_TENANT_ID,
      gateway: gatewayId,
      eventId: event.eventId,
      type: event.type,
      payload: event.raw as Record<string, unknown>,
      processedAt: new Date(),
    });
  } catch (err) {
    // duplicate key → already processed
    if (
      err &&
      typeof err === 'object' &&
      'code' in err &&
      (err as { code?: number }).code === 11000
    ) {
      return { duplicate: true, event };
    }
    throw err;
  }

  let payment: IPayment | null = null;
  if (event.paymentId) {
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
    await PaymentEvent.updateOne(
      { tenantId: DEFAULT_TENANT_ID, gateway: gatewayId, eventId: event.eventId },
      { $set: { paymentId: payment._id } },
    );

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
      payment.status =
        payment.refundedAmount >= payment.amount ? 'refunded' : 'partially_refunded';
      await payment.save();
    }
  }

  if (event.gatewaySubscriptionId && event.type.startsWith('subscription.')) {
    const sub = await SubscriptionIntent.findOne({
      tenantId: DEFAULT_TENANT_ID,
      gateway: gatewayId,
      gatewaySubscriptionId: event.gatewaySubscriptionId,
    });
    if (sub) {
      if (event.type === 'subscription.cancelled') {
        sub.status = 'cancelled';
      } else if (event.status) {
        const allowed = ['trialing', 'active', 'past_due', 'paused', 'cancelled'] as const;
        if ((allowed as readonly string[]).includes(event.status)) {
          sub.status = event.status as (typeof allowed)[number];
        }
      }
      await sub.save();
    }
  }

  return {
    duplicate: false,
    event,
    payment: payment ? serializePayment(payment) : null,
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
    status: parsed.trialDays ? 'trialing' : 'active',
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

  return {
    id: String(doc._id),
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
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export async function cancelSubscription(id: string) {
  const { SubscriptionIntent } = await ensureDb();
  const doc = await SubscriptionIntent.findOne({ _id: id, tenantId: DEFAULT_TENANT_ID });
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

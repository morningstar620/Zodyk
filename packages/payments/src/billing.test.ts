import type Stripe from 'stripe';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPrice, createProduct, getPaymentLink, startPaymentLinkCheckout } from './catalog';
import { normalizeStripeEvent } from './gateways/stripe';
import { renderInvoicePdf } from './invoice';
import { summarizeBilling } from './metrics';
import { applyPaymentEvent, createSubscription, listSubscriptions } from './services';

type Row = Record<string, unknown> & { _id: string };

const memory = vi.hoisted(() => {
  type MemoryRow = Record<string, unknown> & { _id: string };
  const buckets = {
    payments: [] as MemoryRow[],
    events: [] as MemoryRow[],
    subscriptions: [] as MemoryRow[],
    products: [] as MemoryRow[],
    prices: [] as MemoryRow[],
  };
  const failSaves = new Map<string, number>();
  let seq = 0;
  let skipEventFinds = 0;

  function nextId() {
    seq += 1;
    return `507f1f77bcf86cd79943${String(seq).padStart(4, '0')}`;
  }

  function view(bucket: MemoryRow[], stored: MemoryRow) {
    const copy: MemoryRow & { save: () => Promise<void> } = {
      ...stored,
      save: async () => undefined,
    };
    copy.save = async () => {
      const remaining = failSaves.get(stored._id) ?? 0;
      if (remaining > 0) {
        failSaves.set(stored._id, remaining - 1);
        throw new Error('save failed');
      }
      const next: MemoryRow = { _id: stored._id };
      for (const [key, value] of Object.entries(copy)) {
        if (key === 'save') continue;
        next[key] = value;
      }
      const index = bucket.findIndex((row) => row._id === stored._id);
      if (index >= 0) bucket[index] = next;
    };
    return copy;
  }

  function matches(row: MemoryRow, filter: Record<string, unknown>): boolean {
    return Object.entries(filter).every(([key, expected]) => {
      if (expected && typeof expected === 'object' && !Array.isArray(expected)) {
        const query = expected as Record<string, unknown>;
        if (Array.isArray(query.$in)) {
          return query.$in.map(String).includes(String(row[key]));
        }
        const exists = row[key] !== undefined && row[key] !== null;
        if (query.$exists === false) return !exists;
        if (query.$exists === true) return exists;
        return false;
      }
      return row[key] === expected || String(row[key]) === String(expected);
    });
  }

  function collection(bucket: MemoryRow[]) {
    return {
      async create(data: Record<string, unknown>) {
        if (bucket === buckets.events || bucket === buckets.prices) {
          const duplicate = bucket.find((row) => {
            if (bucket === buckets.events) {
              return (
                row.tenantId === data.tenantId &&
                row.gateway === data.gateway &&
                row.eventId === data.eventId
              );
            }
            return row.publicToken === data.publicToken && row.tenantId === data.tenantId;
          });
          if (duplicate) {
            throw Object.assign(new Error('E11000 duplicate key'), { code: 11000 });
          }
        }
        const stored: MemoryRow = { ...data, _id: String(data._id ?? nextId()) };
        bucket.push(stored);
        return view(bucket, stored);
      },
      async findOne(filter: Record<string, unknown>) {
        if (bucket === buckets.events && skipEventFinds > 0) {
          skipEventFinds -= 1;
          return null;
        }
        const stored = bucket.find((row) => matches(row, filter));
        return stored ? view(bucket, stored) : null;
      },
      find(filter: Record<string, unknown>) {
        const result = bucket.filter((row) => matches(row, filter));
        const query = {
          sort() {
            return query;
          },
          skip() {
            return query;
          },
          limit() {
            return query;
          },
          select() {
            return query;
          },
          then(
            onFulfilled: (value: Array<MemoryRow & { save: () => Promise<void> }>) => unknown,
            onRejected?: (reason: unknown) => unknown,
          ) {
            return Promise.resolve(result.map((row) => view(bucket, row))).then(
              onFulfilled,
              onRejected,
            );
          },
        };
        return query;
      },
      async countDocuments(filter: Record<string, unknown>) {
        return bucket.filter((row) => matches(row, filter)).length;
      },
      async updateOne(
        filter: Record<string, unknown>,
        update: { $set?: Record<string, unknown>; $unset?: Record<string, unknown> },
      ) {
        const stored = bucket.find((row) => row._id === filter._id || matches(row, filter));
        if (!stored) return;
        Object.assign(stored, update.$set ?? {});
        for (const key of Object.keys(update.$unset ?? {})) delete stored[key];
      },
    };
  }

  const gateway = {
    capabilities: {
      oneTime: true,
      refunds: true,
      webhooks: true,
      subscriptions: true,
    },
    createCheckout: vi.fn(async (input: { successUrl?: string }) => {
      const successUrl = input.successUrl ?? '';
      return {
        gatewayPaymentId: 'cs_pay_1',
        checkoutUrl: successUrl.startsWith('http')
          ? 'https://checkout.test/pay'
          : 'https://checkout.test/missing',
      };
    }),
    createSubscription: vi.fn(async () => ({
      gatewaySubscriptionId: 'cs_test_session',
      checkoutUrl: 'https://checkout.test/sub',
    })),
  };

  return {
    buckets,
    failSaves,
    collection,
    gateway,
    skipNextEventFind() {
      skipEventFinds += 1;
    },
    reset() {
      buckets.payments.length = 0;
      buckets.events.length = 0;
      buckets.subscriptions.length = 0;
      buckets.products.length = 0;
      buckets.prices.length = 0;
      failSaves.clear();
      skipEventFinds = 0;
      seq = 0;
      gateway.createCheckout.mockClear();
      gateway.createSubscription.mockClear();
    },
  };
});

vi.mock('@zodyk/database', () => ({
  connectDatabase: async () => ({}),
  getModels: () => ({
    Payment: memory.collection(memory.buckets.payments),
    PaymentEvent: memory.collection(memory.buckets.events),
    SubscriptionIntent: memory.collection(memory.buckets.subscriptions),
    Product: memory.collection(memory.buckets.products),
    Price: memory.collection(memory.buckets.prices),
  }),
}));

vi.mock('./config', () => ({
  getActivePaymentGateway: async () => ({
    gateway: memory.gateway,
    config: {
      activeGateway: 'stripe',
      mode: 'test' as const,
      credentials: {},
      source: 'db' as const,
    },
  }),
}));

function stripeEvent(id: string, type: string, object: Record<string, unknown>): Stripe.Event {
  return { id, type, data: { object } } as unknown as Stripe.Event;
}

function row(bucket: Row[], id: string) {
  return bucket.find((item) => item._id === id);
}

beforeEach(() => {
  memory.reset();
});

describe('stripe subscription events', () => {
  it('persists the subscription id from checkout and lets a later update change status', async () => {
    const created = await memory.collection(memory.buckets.subscriptions).create({
      tenantId: 'default',
      amount: 1500,
      currency: 'USD',
      interval: 'month',
      intervalCount: 1,
      status: 'pending',
      referenceType: 'price',
      referenceId: 'price_1',
      gateway: 'stripe',
      gatewaySubscriptionId: 'cs_test_123',
      cancelAtPeriodEnd: false,
    });

    const completed = normalizeStripeEvent(
      stripeEvent('evt_checkout', 'checkout.session.completed', {
        id: 'cs_test_123',
        mode: 'subscription',
        payment_status: 'paid',
        subscription: 'sub_123',
        metadata: { subscriptionId: created._id },
        currency: 'usd',
        amount_total: 1500,
      }),
    );
    expect(completed.type).toBe('subscription.updated');
    expect(completed.gatewaySubscriptionId).toBe('sub_123');
    expect(completed.subscriptionId).toBe(created._id);
    expect(completed.promotePendingOnly).toBe(true);

    const checkedOut = await applyPaymentEvent('stripe', completed);
    expect(checkedOut.duplicate).toBe(false);
    expect(checkedOut.subscription?.gatewaySubscriptionId).toBe('sub_123');
    expect(checkedOut.subscription?.status).toBe('active');

    const updated = normalizeStripeEvent(
      stripeEvent('evt_sub', 'customer.subscription.updated', {
        id: 'sub_123',
        status: 'past_due',
        metadata: { subscriptionId: created._id },
      }),
    );
    expect(updated.gatewaySubscriptionId).toBe('sub_123');
    expect(updated.status).toBe('past_due');
    const changed = await applyPaymentEvent('stripe', updated);
    expect(changed.subscription?.status).toBe('past_due');
    expect(row(memory.buckets.subscriptions, created._id)?.gatewaySubscriptionId).toBe('sub_123');
  });

  it('keeps an unpaid checkout pending until a confirming subscription webhook', async () => {
    const created = await memory.collection(memory.buckets.subscriptions).create({
      tenantId: 'default',
      amount: 1500,
      currency: 'USD',
      interval: 'month',
      intervalCount: 1,
      status: 'pending',
      referenceType: 'price',
      referenceId: 'price_1',
      gateway: 'stripe',
      gatewaySubscriptionId: 'cs_unpaid',
      cancelAtPeriodEnd: false,
    });
    const unpaid = normalizeStripeEvent(
      stripeEvent('evt_unpaid', 'checkout.session.completed', {
        id: 'cs_unpaid',
        mode: 'subscription',
        payment_status: 'unpaid',
        subscription: 'sub_unpaid',
        metadata: { subscriptionId: created._id },
      }),
    );
    expect(unpaid.status).toBeUndefined();
    const pending = await applyPaymentEvent('stripe', unpaid);
    expect(pending.subscription?.status).toBe('pending');
    expect(pending.subscription?.gatewaySubscriptionId).toBe('sub_unpaid');

    const trialing = normalizeStripeEvent(
      stripeEvent('evt_trial', 'customer.subscription.updated', {
        id: 'sub_unpaid',
        status: 'trialing',
        metadata: { subscriptionId: created._id },
      }),
    );
    const confirmed = await applyPaymentEvent('stripe', trialing);
    expect(confirmed.subscription?.status).toBe('trialing');
  });

  it('does not let checkout confirmation overwrite a later subscription status', async () => {
    const created = await memory.collection(memory.buckets.subscriptions).create({
      tenantId: 'default',
      amount: 900,
      currency: 'USD',
      interval: 'month',
      intervalCount: 1,
      status: 'pending',
      referenceType: 'price',
      referenceId: 'price_1',
      gateway: 'stripe',
      gatewaySubscriptionId: 'cs_order',
      cancelAtPeriodEnd: false,
    });
    await applyPaymentEvent(
      'stripe',
      normalizeStripeEvent(
        stripeEvent('evt_first', 'customer.subscription.updated', {
          id: 'sub_order',
          status: 'active',
          metadata: { subscriptionId: created._id },
        }),
      ),
    );
    await applyPaymentEvent(
      'stripe',
      normalizeStripeEvent(
        stripeEvent('evt_second', 'checkout.session.completed', {
          id: 'cs_order',
          mode: 'subscription',
          payment_status: 'no_payment_required',
          subscription: 'sub_order',
          metadata: { subscriptionId: created._id },
        }),
      ),
    );
    expect(row(memory.buckets.subscriptions, created._id)?.status).toBe('active');
  });

  it('maps Stripe canceled to cancelled and ignores incomplete', () => {
    const deleted = normalizeStripeEvent(
      stripeEvent('evt_deleted', 'customer.subscription.deleted', {
        id: 'sub_gone',
        status: 'canceled',
        metadata: { subscriptionId: '507f1f77bcf86cd799439011' },
      }),
    );
    expect(deleted.type).toBe('subscription.cancelled');
    expect(deleted.status).toBe('cancelled');

    const incomplete = normalizeStripeEvent(
      stripeEvent('evt_incomplete', 'customer.subscription.updated', {
        id: 'sub_wait',
        status: 'incomplete',
        metadata: {},
      }),
    );
    expect(incomplete.status).toBeUndefined();
    expect(incomplete.gatewaySubscriptionId).toBe('sub_wait');
  });

  it('leaves one-time checkout sessions as payment events', () => {
    const paid = normalizeStripeEvent(
      stripeEvent('evt_once', 'checkout.session.completed', {
        id: 'cs_once',
        mode: 'payment',
        payment_status: 'paid',
        metadata: { paymentId: '507f1f77bcf86cd799439011' },
        currency: 'usd',
        amount_total: 500,
      }),
    );
    expect(paid.type).toBe('payment.succeeded');
    expect(paid.gatewayPaymentId).toBe('cs_once');
    expect(paid.paymentId).toBe('507f1f77bcf86cd799439011');
    expect(paid.gatewaySubscriptionId).toBeUndefined();
  });
});

describe('subscription creation', () => {
  it('stays pending until the gateway confirms, including trials', async () => {
    const created = await createSubscription({
      amount: 1500,
      currency: 'usd',
      interval: 'month',
      intervalCount: 1,
      trialDays: 14,
      reference: { type: 'price', id: 'price_1' },
      successUrl: 'https://example.com/success',
      cancelUrl: 'https://example.com/cancel',
      customer: { email: 'buyer@example.com' },
    });
    expect(created.status).toBe('pending');
    expect(created.trialDays).toBe(14);
    expect(created.gatewaySubscriptionId).toBe('cs_test_session');

    const listed = await listSubscriptions({ status: 'pending' });
    expect(listed.total).toBe(1);
    expect(listed.items[0]?.id).toBe(created.id);
    expect(listed.items[0]?.status).toBe('pending');
  });
});

describe('webhook retry', () => {
  async function pendingPayment() {
    return memory.collection(memory.buckets.payments).create({
      tenantId: 'default',
      amount: 2000,
      currency: 'USD',
      status: 'pending',
      referenceType: 'order',
      referenceId: 'ord_1',
      gateway: 'stripe',
      refundedAmount: 0,
    });
  }

  it('updates the payment when a failed handler is replayed', async () => {
    const payment = await pendingPayment();
    memory.failSaves.set(String(payment._id), 1);
    const event = {
      type: 'payment.succeeded' as const,
      eventId: 'evt_retry',
      paymentId: String(payment._id),
      raw: { id: 'evt_retry' },
    };

    await expect(applyPaymentEvent('stripe', event)).rejects.toThrow('save failed');
    const storedEvent = memory.buckets.events.find((item) => item.eventId === 'evt_retry');
    expect(storedEvent?.processedAt).toBeUndefined();
    expect(storedEvent?.error).toBe('save failed');
    expect(row(memory.buckets.payments, String(payment._id))?.status).toBe('pending');

    const replayed = await applyPaymentEvent('stripe', event);
    expect(replayed.duplicate).toBe(false);
    expect(replayed.payment?.status).toBe('paid');
    expect(row(memory.buckets.payments, String(payment._id))?.status).toBe('paid');

    const duplicate = await applyPaymentEvent('stripe', event);
    expect(duplicate).toEqual({ duplicate: true, event });
  });

  it('processes an event whose insert lost the race and was left unprocessed', async () => {
    const payment = await pendingPayment();
    await memory.collection(memory.buckets.events).create({
      tenantId: 'default',
      gateway: 'stripe',
      eventId: 'evt_race',
      type: 'payment.succeeded',
      payload: { id: 'evt_race' },
    });
    memory.skipNextEventFind();
    const result = await applyPaymentEvent('stripe', {
      type: 'payment.succeeded',
      eventId: 'evt_race',
      paymentId: String(payment._id),
      raw: { id: 'evt_race' },
    });
    expect(result.duplicate).toBe(false);
    expect(result.payment?.status).toBe('paid');
  });
});

describe('catalog, invoices, and metrics', () => {
  it('creates a product price, opens a payment link, and renders an invoice', async () => {
    const product = await createProduct({ name: 'Field guide', description: 'A short book' });
    const price = await createPrice({
      productId: product.id,
      type: 'one_time',
      amount: 2500,
      currency: 'usd',
    });
    const link = await getPaymentLink(price.publicToken);
    expect(link.product.name).toBe('Field guide');
    expect(link.price.amount).toBe(2500);

    const checkout = await startPaymentLinkCheckout(price.publicToken, {
      customer: { email: 'reader@example.com', name: 'Reader' },
      successUrl: 'https://evil.example/phish',
    });
    expect(checkout.kind).toBe('payment');
    expect(checkout.status).toBe('pending');
    expect(checkout.checkoutUrl).toBe('https://checkout.test/pay');
    expect(memory.gateway.createCheckout.mock.calls[0]?.[0]?.successUrl).toBe(
      `http://localhost:5001/pay/${price.publicToken}?status=success`,
    );

    const paymentId = checkout.id;
    const paid = await applyPaymentEvent('stripe', {
      type: 'payment.succeeded',
      eventId: 'evt_book',
      paymentId,
      raw: { id: 'evt_book' },
    });
    expect(paid.payment?.status).toBe('paid');
    const pdf = renderInvoicePdf({
      id: paymentId,
      amount: 2500,
      currency: 'USD',
      status: 'paid',
      reference: { type: 'price', id: price.id },
      gateway: 'stripe',
      description: 'Field guide',
      customer: { email: 'reader@example.com' },
      refundedAmount: 0,
      paidAt: new Date('2026-01-02T00:00:00.000Z'),
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    });
    expect(pdf.subarray(0, 5).toString('latin1')).toBe('%PDF-');
    expect(pdf.toString('latin1')).toContain(paymentId);
  });

  it('summarizes revenue, MRR, and churn', () => {
    const metrics = summarizeBilling({
      payments: [
        { amount: 5000, currency: 'usd', refundedAmount: 1000 },
        { amount: 2000, currency: 'EUR', refundedAmount: 0 },
      ],
      subscriptions: [
        { amount: 3000, currency: 'USD', interval: 'month', intervalCount: 1, status: 'active' },
        { amount: 12000, currency: 'USD', interval: 'year', intervalCount: 1, status: 'trialing' },
        { amount: 3000, currency: 'USD', interval: 'month', intervalCount: 1, status: 'cancelled' },
        { amount: 3000, currency: 'USD', interval: 'month', intervalCount: 1, status: 'pending' },
      ],
    });
    expect(metrics.revenue).toEqual([
      { currency: 'USD', amount: 4000, count: 1 },
      { currency: 'EUR', amount: 2000, count: 1 },
    ]);
    expect(metrics.mrr).toEqual([{ currency: 'USD', amount: 4000, count: 2 }]);
    expect(metrics.subscribers.pending).toBe(1);
    expect(metrics.churnRate).toBeCloseTo(1 / 3);
  });
});

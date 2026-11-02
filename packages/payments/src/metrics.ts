import { DEFAULT_TENANT_ID, type SubscriptionStatus } from '@zodyk/core';
import { ensureDb } from './db';

export interface CurrencyTotal {
  currency: string;
  amount: number;
  count?: number;
}

export interface PaymentMetrics {
  revenue: CurrencyTotal[];
  mrr: CurrencyTotal[];
  subscribers: Record<SubscriptionStatus, number>;
  /** Cancelled subscriptions divided by every subscription that left pending. */
  churnRate: number;
}

interface RevenueRow {
  amount: number;
  currency: string;
  refundedAmount: number;
}

interface SubscriptionRow {
  amount: number;
  currency: string;
  interval: string;
  intervalCount: number;
  status: string;
}

export function monthlyAmount(amount: number, interval: string, intervalCount: number): number {
  const count = intervalCount > 0 ? intervalCount : 1;
  switch (interval) {
    case 'day':
      return Math.round((amount * 30) / count);
    case 'week':
      return Math.round((amount * 30) / (7 * count));
    case 'month':
      return Math.round(amount / count);
    case 'year':
      return Math.round(amount / (12 * count));
    default:
      return 0;
  }
}

function addCurrency(totals: Map<string, CurrencyTotal>, currency: string, amount: number) {
  const key = currency.toUpperCase();
  const current = totals.get(key) ?? { currency: key, amount: 0, count: 0 };
  current.amount += amount;
  current.count = (current.count ?? 0) + 1;
  totals.set(key, current);
}

export function summarizeBilling(input: {
  payments: RevenueRow[];
  subscriptions: SubscriptionRow[];
}): PaymentMetrics {
  const revenue = new Map<string, CurrencyTotal>();
  for (const payment of input.payments) {
    const net = Math.max(0, payment.amount - (payment.refundedAmount || 0));
    addCurrency(revenue, payment.currency, net);
  }

  const subscribers: Record<SubscriptionStatus, number> = {
    pending: 0,
    trialing: 0,
    active: 0,
    past_due: 0,
    paused: 0,
    cancelled: 0,
  };
  const mrr = new Map<string, CurrencyTotal>();
  for (const subscription of input.subscriptions) {
    if (subscription.status in subscribers) {
      subscribers[subscription.status as SubscriptionStatus] += 1;
    }
    if (
      subscription.status === 'active' ||
      subscription.status === 'trialing' ||
      subscription.status === 'past_due'
    ) {
      addCurrency(
        mrr,
        subscription.currency,
        monthlyAmount(subscription.amount, subscription.interval, subscription.intervalCount),
      );
    }
  }

  const started =
    subscribers.trialing +
    subscribers.active +
    subscribers.past_due +
    subscribers.paused +
    subscribers.cancelled;
  const churnRate = started === 0 ? 0 : subscribers.cancelled / started;

  return {
    revenue: [...revenue.values()],
    mrr: [...mrr.values()],
    subscribers,
    churnRate,
  };
}

export async function getPaymentMetrics(): Promise<PaymentMetrics> {
  const { Payment, SubscriptionIntent } = await ensureDb();
  const [payments, subscriptions] = await Promise.all([
    Payment.find({
      tenantId: DEFAULT_TENANT_ID,
      status: { $in: ['paid', 'partially_refunded', 'refunded'] },
    }).select('amount currency refundedAmount'),
    SubscriptionIntent.find({ tenantId: DEFAULT_TENANT_ID }).select(
      'amount currency interval intervalCount status',
    ),
  ]);

  return summarizeBilling({
    payments: payments.map((payment) => ({
      amount: payment.amount,
      currency: payment.currency,
      refundedAmount: payment.refundedAmount,
    })),
    subscriptions: subscriptions.map((subscription) => ({
      amount: subscription.amount,
      currency: subscription.currency,
      interval: subscription.interval,
      intervalCount: subscription.intervalCount,
      status: subscription.status,
    })),
  });
}

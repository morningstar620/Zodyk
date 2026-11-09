import { beforeEach, describe, expect, it, vi } from 'vitest';

const harness = vi.hoisted(() => {
  const payment = {
    _id: { toString: () => 'payment-1' },
    tenantId: 'default',
    amount: 2500,
    currency: 'USD',
    status: 'pending',
    referenceType: 'order',
    referenceId: 'order-1',
    gateway: 'stripe',
    gatewayPaymentId: 'cs_test_checkout',
    refundedAmount: 0,
    paidAt: undefined as Date | undefined,
    save: vi.fn(async () => undefined),
  };
  const event = {
    type: 'payment.succeeded',
    eventId: 'evt_checkout_paid',
    gatewayPaymentId: 'cs_test_checkout',
    raw: { id: 'evt_checkout_paid' },
  };
  const models = {
    Payment: {
      findOne: vi.fn(async (filter: Record<string, unknown>) => {
        if (filter.gatewayPaymentId === event.gatewayPaymentId) return payment;
        return null;
      }),
    },
    PaymentEvent: {
      create: vi.fn(async () => undefined),
      updateOne: vi.fn(async () => undefined),
    },
    SubscriptionIntent: {
      findOne: vi.fn(async () => null),
    },
  };

  return { event, models, payment };
});

vi.mock('@zodyk/database', () => ({
  connectDatabase: vi.fn(async () => undefined),
  getModels: () => harness.models,
}));

vi.mock('./config', () => ({
  getActivePaymentGateway: async () => ({
    config: { activeGateway: 'stripe' },
    gateway: {
      verifyWebhook: async () => harness.event,
    },
  }),
}));

import { handleWebhook } from './services';

describe('payment webhook reconciliation', () => {
  beforeEach(() => {
    process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/zodyk-test';
    harness.payment.status = 'pending';
    harness.payment.paidAt = undefined;
    vi.clearAllMocks();
  });

  it('matches a checkout completion to its stored gateway payment id', async () => {
    const result = await handleWebhook('stripe', {
      headers: {},
      rawBody: '{}',
    });

    expect(harness.models.Payment.findOne).toHaveBeenCalledWith({
      tenantId: 'default',
      gateway: 'stripe',
      gatewayPaymentId: 'cs_test_checkout',
    });
    expect(harness.payment.status).toBe('paid');
    expect(harness.payment.paidAt).toBeInstanceOf(Date);
    expect(harness.payment.save).toHaveBeenCalledOnce();
    expect(result).toMatchObject({
      duplicate: false,
      payment: {
        id: 'payment-1',
        status: 'paid',
        gatewayPaymentId: 'cs_test_checkout',
      },
    });
  });
});

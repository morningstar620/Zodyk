import { AuthError, logAuditEvent, requirePermission, type AuthSession } from '@zodyk/auth';
import {
  createPaymentSchema,
  createSubscriptionSchema,
  paymentListQuerySchema,
  paymentsSettingsUpdateSchema,
  refundPaymentSchema,
} from '@zodyk/core';
import {
  PaymentsError,
  cancelSubscription,
  createPayment,
  createSubscription,
  getPayment,
  getPaymentsSettingsPublic,
  handleWebhook,
  listPayments,
  refundPayment,
  savePaymentsSettings,
} from '@zodyk/payments';

export async function getPaymentsSettingsHandler(session: AuthSession | null) {
  requirePermission(session, 'settings:read');
  return getPaymentsSettingsPublic();
}

export async function updatePaymentsSettingsHandler(
  session: AuthSession | null,
  body: unknown,
  ip?: string,
) {
  requirePermission(session, 'settings:update');

  const settings = await getPaymentsSettingsPublic();
  if (settings.readOnly) {
    throw new AuthError(
      'Payments settings are managed via environment variables and cannot be updated in the UI.',
      400,
    );
  }

  const parsed = paymentsSettingsUpdateSchema.parse(body);
  const credentials =
    parsed.credentials &&
    Object.fromEntries(Object.entries(parsed.credentials).map(([k, v]) => [k, String(v)]));

  await savePaymentsSettings({
    activeGateway: parsed.activeGateway,
    mode: parsed.mode,
    gateway: parsed.gateway,
    credentials,
  });

  await logAuditEvent({
    action: 'payments.settings.update',
    actorId: session?.userId,
    resource: 'payments',
    resourceId: parsed.gateway,
    ip,
    metadata: {
      activeGateway: parsed.activeGateway,
      mode: parsed.mode,
      gateway: parsed.gateway,
    },
  });

  return getPaymentsSettingsPublic();
}

export async function listPaymentsHandler(
  session: AuthSession | null,
  query: Record<string, string | undefined>,
) {
  requirePermission(session, 'payments:read');
  const parsed = paymentListQuerySchema.parse(query);
  return listPayments(parsed);
}

export async function getPaymentHandler(session: AuthSession | null, id: string) {
  requirePermission(session, 'payments:read');
  return getPayment(id);
}

export async function createPaymentHandler(
  session: AuthSession | null,
  body: unknown,
  ip?: string,
) {
  requirePermission(session, 'payments:create');
  const parsed = createPaymentSchema.parse(body);
  const payment = await createPayment(parsed);

  await logAuditEvent({
    action: 'payments.create',
    actorId: session?.userId,
    resource: 'payment',
    resourceId: payment.id,
    ip,
    metadata: {
      amount: payment.amount,
      currency: payment.currency,
      gateway: payment.gateway,
      referenceType: payment.reference.type,
      referenceId: payment.reference.id,
    },
  });

  return payment;
}

export async function refundPaymentHandler(
  session: AuthSession | null,
  id: string,
  body: unknown,
  ip?: string,
) {
  requirePermission(session, 'payments:refund');
  const parsed = refundPaymentSchema.parse(body ?? {});
  const result = await refundPayment(id, parsed);

  await logAuditEvent({
    action: 'payments.refund',
    actorId: session?.userId,
    resource: 'payment',
    resourceId: id,
    ip,
    metadata: {
      gatewayRefundId: result.gatewayRefundId,
      amount: parsed.amount,
      reason: parsed.reason,
    },
  });

  return result;
}

export async function createSubscriptionHandler(
  session: AuthSession | null,
  body: unknown,
  ip?: string,
) {
  requirePermission(session, 'payments:create');
  const parsed = createSubscriptionSchema.parse(body);
  const subscription = await createSubscription(parsed);

  await logAuditEvent({
    action: 'payments.subscription.create',
    actorId: session?.userId,
    resource: 'subscription',
    resourceId: subscription.id,
    ip,
    metadata: {
      amount: subscription.amount,
      currency: subscription.currency,
      gateway: subscription.gateway,
    },
  });

  return subscription;
}

export async function cancelSubscriptionHandler(
  session: AuthSession | null,
  id: string,
  ip?: string,
) {
  requirePermission(session, 'payments:refund');
  const result = await cancelSubscription(id);

  await logAuditEvent({
    action: 'payments.subscription.cancel',
    actorId: session?.userId,
    resource: 'subscription',
    resourceId: id,
    ip,
  });

  return result;
}

export async function paymentsWebhookHandler(gateway: string, request: Request) {
  const rawBody = await request.text();
  return handleWebhook(gateway, {
    headers: request.headers,
    rawBody,
  });
}

export {
  createPriceHandler,
  createProductHandler,
  downloadInvoiceHandler,
  getPaymentLinkHandler,
  getPaymentMetricsHandler,
  getProductHandler,
  getSubscriptionHandler,
  listPaymentEventsHandler,
  listPricesHandler,
  listProductsHandler,
  listSubscriptionsHandler,
  startPaymentLinkCheckoutHandler,
  updatePriceHandler,
  updateProductHandler,
} from './billing-handlers';

export function handlePaymentsError(error: unknown): Response | null {
  if (error instanceof PaymentsError) {
    return Response.json({ error: error.message, code: error.code }, { status: error.status });
  }
  return null;
}

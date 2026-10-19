import { logAuditEvent, requirePermission, type AuthSession } from '@zodyk/auth';
import {
  createPriceSchema,
  createProductSchema,
  paymentEventListQuerySchema,
  paymentLinkCheckoutSchema,
  subscriptionListQuerySchema,
  updatePriceSchema,
  updateProductSchema,
} from '@zodyk/core';
import {
  createPrice,
  createProduct,
  getInvoicePdf,
  getPaymentLink,
  getPaymentMetrics,
  getProduct,
  getSubscription,
  listPaymentEvents,
  listPrices,
  listProducts,
  listSubscriptions,
  startPaymentLinkCheckout,
  updatePrice,
  updateProduct,
} from '@zodyk/payments';

export async function listSubscriptionsHandler(
  session: AuthSession | null,
  query: Record<string, string | undefined>,
) {
  requirePermission(session, 'payments:read');
  return listSubscriptions(subscriptionListQuerySchema.parse(query));
}

export async function getSubscriptionHandler(session: AuthSession | null, id: string) {
  requirePermission(session, 'payments:read');
  return getSubscription(id);
}

export async function getPaymentMetricsHandler(session: AuthSession | null) {
  requirePermission(session, 'payments:read');
  return getPaymentMetrics();
}

export async function listPaymentEventsHandler(
  session: AuthSession | null,
  query: Record<string, string | undefined>,
) {
  requirePermission(session, 'payments:read');
  return listPaymentEvents(paymentEventListQuerySchema.parse(query));
}

export async function listProductsHandler(session: AuthSession | null) {
  requirePermission(session, 'payments:read');
  return listProducts();
}

export async function getProductHandler(session: AuthSession | null, id: string) {
  requirePermission(session, 'payments:read');
  return getProduct(id);
}

export async function createProductHandler(
  session: AuthSession | null,
  body: unknown,
  ip?: string,
) {
  requirePermission(session, 'payments:create');
  const parsed = createProductSchema.parse(body);
  const product = await createProduct(parsed);
  await logAuditEvent({
    action: 'payments.product.create',
    actorId: session?.userId,
    resource: 'product',
    resourceId: product.id,
    ip,
    metadata: { name: product.name },
  });
  return product;
}

export async function updateProductHandler(
  session: AuthSession | null,
  id: string,
  body: unknown,
  ip?: string,
) {
  requirePermission(session, 'payments:create');
  const parsed = updateProductSchema.parse(body);
  const product = await updateProduct(id, parsed);
  await logAuditEvent({
    action: 'payments.product.update',
    actorId: session?.userId,
    resource: 'product',
    resourceId: id,
    ip,
    metadata: { status: product.status },
  });
  return product;
}

export async function listPricesHandler(
  session: AuthSession | null,
  query: Record<string, string | undefined>,
) {
  requirePermission(session, 'payments:read');
  return listPrices(query.productId);
}

export async function createPriceHandler(session: AuthSession | null, body: unknown, ip?: string) {
  requirePermission(session, 'payments:create');
  const parsed = createPriceSchema.parse(body);
  const price = await createPrice(parsed);
  await logAuditEvent({
    action: 'payments.price.create',
    actorId: session?.userId,
    resource: 'price',
    resourceId: price.id,
    ip,
    metadata: { productId: price.productId, amount: price.amount, currency: price.currency },
  });
  return price;
}

export async function updatePriceHandler(
  session: AuthSession | null,
  id: string,
  body: unknown,
  ip?: string,
) {
  requirePermission(session, 'payments:create');
  const parsed = updatePriceSchema.parse(body);
  const price = await updatePrice(id, parsed);
  await logAuditEvent({
    action: 'payments.price.update',
    actorId: session?.userId,
    resource: 'price',
    resourceId: id,
    ip,
    metadata: { status: price.status },
  });
  return price;
}

export async function getPaymentLinkHandler(token: string) {
  return getPaymentLink(token);
}

export async function startPaymentLinkCheckoutHandler(token: string, body: unknown) {
  const parsed = paymentLinkCheckoutSchema.parse(body);
  return startPaymentLinkCheckout(token, parsed);
}

export async function downloadInvoiceHandler(session: AuthSession | null, id: string) {
  requirePermission(session, 'payments:read');
  const invoice = await getInvoicePdf(id);
  const filename = invoice.filename.replace(/[^a-zA-Z0-9._-]/g, '');
  return new Response(new Uint8Array(invoice.body), {
    headers: {
      'content-type': 'application/pdf',
      'content-disposition': `attachment; filename="${filename || 'invoice.pdf'}"`,
    },
  });
}

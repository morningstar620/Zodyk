import { randomBytes } from 'node:crypto';
import {
  DEFAULT_TENANT_ID,
  createPriceSchema,
  createProductSchema,
  paymentLinkCheckoutSchema,
  updatePriceSchema,
  updateProductSchema,
  type CreatePriceInput,
  type CreateProductInput,
  type PaymentLinkCheckoutInput,
  type PriceInterval,
  type UpdatePriceInput,
  type UpdateProductInput,
} from '@zodyk/core';
import type { IPrice, IProduct } from '@zodyk/database';
import { ensureDb } from './db';
import { PaymentsError } from './errors';
import { createPayment, createSubscription } from './services';
import { isObjectId, metadataToRecord } from './utils';

function isDuplicateKeyError(err: unknown): boolean {
  return Boolean(
    err && typeof err === 'object' && 'code' in err && (err as { code?: number }).code === 11000,
  );
}

function serializePrice(doc: IPrice) {
  return {
    id: String(doc._id),
    productId: String(doc.productId),
    type: doc.type,
    amount: doc.amount,
    currency: doc.currency,
    interval: doc.interval,
    intervalCount: doc.intervalCount,
    trialDays: doc.trialDays,
    nickname: doc.nickname,
    gatewayPriceId: doc.gatewayPriceId,
    publicToken: doc.publicToken,
    status: doc.status,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

function serializeProduct(doc: IProduct, prices: IPrice[] = []) {
  return {
    id: String(doc._id),
    name: doc.name,
    description: doc.description,
    image: doc.image,
    status: doc.status,
    metadata: metadataToRecord(doc.metadata as Record<string, string> | Map<string, string>),
    prices: prices.map(serializePrice),
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

async function requireProduct(id: string) {
  if (!isObjectId(id)) {
    throw new PaymentsError(`Product "${id}" was not found.`, 'PRODUCT_NOT_FOUND', 404);
  }
  const { Product } = await ensureDb();
  const doc = await Product.findOne({ _id: id, tenantId: DEFAULT_TENANT_ID });
  if (!doc) throw new PaymentsError(`Product "${id}" was not found.`, 'PRODUCT_NOT_FOUND', 404);
  return doc;
}

async function requirePrice(id: string) {
  if (!isObjectId(id)) {
    throw new PaymentsError(`Price "${id}" was not found.`, 'PRICE_NOT_FOUND', 404);
  }
  const { Price } = await ensureDb();
  const doc = await Price.findOne({ _id: id, tenantId: DEFAULT_TENANT_ID });
  if (!doc) throw new PaymentsError(`Price "${id}" was not found.`, 'PRICE_NOT_FOUND', 404);
  return doc;
}

export async function createProduct(input: CreateProductInput) {
  const parsed = createProductSchema.parse(input);
  const { Product } = await ensureDb();
  const doc = await Product.create({
    tenantId: DEFAULT_TENANT_ID,
    name: parsed.name,
    description: parsed.description,
    image: parsed.image,
    status: parsed.status ?? 'active',
    metadata: parsed.metadata,
  });
  return serializeProduct(doc);
}

export async function updateProduct(id: string, input: UpdateProductInput) {
  const parsed = updateProductSchema.parse(input);
  const doc = await requireProduct(id);
  if (parsed.name !== undefined) doc.name = parsed.name;
  if (parsed.description !== undefined) doc.description = parsed.description;
  if (parsed.image !== undefined) doc.image = parsed.image;
  if (parsed.status !== undefined) doc.status = parsed.status;
  if (parsed.metadata !== undefined) doc.metadata = parsed.metadata;
  await doc.save();
  const { Price } = await ensureDb();
  const prices = await Price.find({ tenantId: DEFAULT_TENANT_ID, productId: doc._id }).sort({
    createdAt: 1,
  });
  return serializeProduct(doc, prices);
}

export async function listProducts() {
  const { Product, Price } = await ensureDb();
  const products = await Product.find({ tenantId: DEFAULT_TENANT_ID }).sort({ createdAt: -1 });
  const prices = await Price.find({
    tenantId: DEFAULT_TENANT_ID,
    productId: { $in: products.map((product) => product._id) },
  }).sort({ createdAt: 1 });
  return {
    items: products.map((product) =>
      serializeProduct(
        product,
        prices.filter((price) => String(price.productId) === String(product._id)),
      ),
    ),
  };
}

export async function getProduct(id: string) {
  const doc = await requireProduct(id);
  const { Price } = await ensureDb();
  const prices = await Price.find({ tenantId: DEFAULT_TENANT_ID, productId: doc._id }).sort({
    createdAt: 1,
  });
  return serializeProduct(doc, prices);
}

export async function createPrice(input: CreatePriceInput) {
  const parsed = createPriceSchema.parse(input);
  await requireProduct(parsed.productId);
  const { Price } = await ensureDb();
  const payload = {
    tenantId: DEFAULT_TENANT_ID,
    productId: parsed.productId,
    type: parsed.type,
    amount: parsed.amount,
    currency: parsed.currency,
    interval: parsed.type === 'recurring' ? parsed.interval : undefined,
    intervalCount: parsed.intervalCount ?? 1,
    trialDays: parsed.trialDays,
    nickname: parsed.nickname,
    status: parsed.status ?? 'active',
  };

  let doc: IPrice | null = null;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      doc = await Price.create({
        ...payload,
        publicToken: randomBytes(24).toString('hex'),
      });
      break;
    } catch (err) {
      if (!isDuplicateKeyError(err) || attempt === 1) throw err;
    }
  }
  if (!doc) throw new PaymentsError('Could not create price', 'PRICE_CREATE_FAILED', 500);
  return serializePrice(doc);
}

export async function updatePrice(id: string, input: UpdatePriceInput) {
  const parsed = updatePriceSchema.parse(input);
  const doc = await requirePrice(id);
  if (parsed.type !== undefined) doc.type = parsed.type;
  if (parsed.amount !== undefined) doc.amount = parsed.amount;
  if (parsed.currency !== undefined) doc.currency = parsed.currency;
  if (parsed.interval !== undefined) doc.interval = parsed.interval;
  if (parsed.intervalCount !== undefined) doc.intervalCount = parsed.intervalCount;
  if (parsed.trialDays !== undefined) doc.trialDays = parsed.trialDays;
  if (parsed.nickname !== undefined) doc.nickname = parsed.nickname;
  if (parsed.status !== undefined) doc.status = parsed.status;
  if (doc.type === 'one_time') doc.interval = undefined;
  if (doc.type === 'recurring' && !doc.interval) {
    throw new PaymentsError('interval is required for recurring prices', 'VALIDATION', 400);
  }
  await doc.save();
  return serializePrice(doc);
}

export async function listPrices(productId?: string) {
  const { Price } = await ensureDb();
  const filter: Record<string, unknown> = { tenantId: DEFAULT_TENANT_ID };
  if (productId) {
    if (!isObjectId(productId)) {
      throw new PaymentsError(`Product "${productId}" was not found.`, 'PRODUCT_NOT_FOUND', 404);
    }
    filter.productId = productId;
  }
  const prices = await Price.find(filter).sort({ createdAt: -1 });
  return { items: prices.map(serializePrice) };
}

function appOrigin(): string {
  const candidates = [process.env.ADMIN_URL, process.env.AUTH_URL, process.env.NEXTAUTH_URL];
  for (const candidate of candidates) {
    if (!candidate) continue;
    try {
      return new URL(candidate).origin;
    } catch {
      continue;
    }
  }
  return 'http://localhost:5001';
}

function resolveReturnUrl(requested: string | undefined, fallback: string): string {
  if (!requested) return fallback;
  try {
    const url = new URL(requested);
    if (url.origin === appOrigin()) return url.toString();
  } catch {
    // Ignore untrusted or malformed return URLs.
  }
  return fallback;
}

async function loadActiveLink(token: string) {
  const { Price, Product } = await ensureDb();
  const price = await Price.findOne({
    tenantId: DEFAULT_TENANT_ID,
    publicToken: token,
    status: 'active',
  });
  if (!price) {
    throw new PaymentsError('This payment link is not available.', 'PAYMENT_LINK_NOT_FOUND', 404);
  }
  const product = await Product.findOne({
    _id: price.productId,
    tenantId: DEFAULT_TENANT_ID,
    status: 'active',
  });
  if (!product) {
    throw new PaymentsError('This payment link is not available.', 'PAYMENT_LINK_NOT_FOUND', 404);
  }
  return { price, product };
}

export async function getPaymentLink(token: string) {
  const { price, product } = await loadActiveLink(token);
  return {
    token,
    product: {
      id: String(product._id),
      name: product.name,
      description: product.description,
      image: product.image,
    },
    price: {
      id: String(price._id),
      type: price.type,
      amount: price.amount,
      currency: price.currency,
      interval: price.interval,
      intervalCount: price.intervalCount,
      trialDays: price.trialDays,
      nickname: price.nickname,
    },
  };
}

export async function startPaymentLinkCheckout(token: string, input: PaymentLinkCheckoutInput) {
  const parsed = paymentLinkCheckoutSchema.parse(input);
  const link = await getPaymentLink(token);
  const successUrl = resolveReturnUrl(
    parsed.successUrl,
    `${appOrigin()}/pay/${token}?status=success`,
  );
  const cancelUrl = resolveReturnUrl(parsed.cancelUrl, `${appOrigin()}/pay/${token}?status=cancel`);
  const metadata = {
    productId: link.product.id,
    productName: link.product.name,
    priceId: link.price.id,
    priceType: link.price.type,
  };
  const description = link.price.nickname || link.product.name;

  if (link.price.type === 'recurring') {
    if (!link.price.interval) {
      throw new PaymentsError('This price is missing a billing interval.', 'VALIDATION', 400);
    }
    const subscription = await createSubscription({
      amount: link.price.amount,
      currency: link.price.currency,
      interval: link.price.interval as PriceInterval,
      intervalCount: link.price.intervalCount,
      trialDays: link.price.trialDays,
      reference: { type: 'price', id: link.price.id },
      customer: parsed.customer,
      successUrl,
      cancelUrl,
      description,
      metadata,
    });
    return {
      kind: 'subscription' as const,
      id: subscription.id,
      status: subscription.status,
      checkoutUrl: subscription.checkoutUrl,
      clientSecret: subscription.clientSecret,
    };
  }

  const payment = await createPayment({
    amount: link.price.amount,
    currency: link.price.currency,
    reference: { type: 'price', id: link.price.id },
    customer: parsed.customer,
    successUrl,
    cancelUrl,
    description,
    metadata,
  });
  return {
    kind: 'payment' as const,
    id: payment.id,
    status: payment.status,
    checkoutUrl: payment.checkoutUrl,
    clientSecret: payment.clientSecret,
  };
}

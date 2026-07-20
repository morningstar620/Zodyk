import {
  createPageSchema,
  DEFAULT_TENANT_ID,
  paginationSchema,
  publishPageSchema,
  slugToHandle,
  updatePageSchema,
} from '@zodyk/core';
import { AuthError, logAuditEvent, requirePermission, type AuthSession } from '@zodyk/auth';
import { connectDatabase, getModels } from '@zodyk/database';
import { invalidateCatalogCache } from '../themes/catalog-cache';

function serializePage(item: {
  _id: { toString(): string };
  title: string;
  slug: string;
  handle: string;
  parentId?: { toString(): string };
  templateSuffix?: string;
  body?: string;
  seo: Record<string, unknown>;
  status: string;
  publishedAt?: Date;
  scheduledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: item._id.toString(),
    title: item.title,
    slug: item.slug,
    handle: item.handle,
    parentId: item.parentId?.toString(),
    templateSuffix: item.templateSuffix,
    body: item.body,
    seo: item.seo,
    status: item.status,
    publishedAt: item.publishedAt,
    scheduledAt: item.scheduledAt,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

export async function listPages(
  session: AuthSession | null,
  params: Record<string, string | string[] | undefined>,
) {
  requirePermission(session, 'pages:read');
  const { page, limit, search } = paginationSchema.parse({
    page: params.page,
    limit: params.limit,
    search: params.search,
  });
  const status = typeof params.status === 'string' ? params.status : undefined;

  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is required');
  await connectDatabase(uri);
  const { Page } = getModels();

  const filter: Record<string, unknown> = { tenantId: DEFAULT_TENANT_ID };
  if (status) filter.status = status;
  if (search) {
    filter.$or = [
      { title: { $regex: search, $options: 'i' } },
      { slug: { $regex: search, $options: 'i' } },
    ];
  }

  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    Page.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(limit).lean(),
    Page.countDocuments(filter),
  ]);

  return {
    data: items.map(serializePage),
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  };
}

export async function getPage(session: AuthSession | null, id: string) {
  requirePermission(session, 'pages:read');
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is required');
  await connectDatabase(uri);
  const { Page } = getModels();

  const item = await Page.findOne({ _id: id, tenantId: DEFAULT_TENANT_ID }).lean();
  if (!item) throw new AuthError('Page not found', 404);
  return serializePage(item);
}

export async function createPage(session: AuthSession | null, body: unknown, ip?: string) {
  requirePermission(session, 'pages:create');
  const input = createPageSchema.parse(body);

  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is required');
  await connectDatabase(uri);
  const { Page } = getModels();

  const existing = await Page.findOne({ slug: input.slug, tenantId: DEFAULT_TENANT_ID });
  if (existing) throw new AuthError('Page slug already exists', 409);

  const item = await Page.create({
    title: input.title,
    slug: input.slug,
    handle: input.handle ?? slugToHandle(input.slug),
    parentId: input.parentId,
    templateSuffix: input.templateSuffix,
    body: input.body,
    seo: input.seo ?? {},
    status: input.status,
    scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : undefined,
    tenantId: DEFAULT_TENANT_ID,
  });

  await logAuditEvent({
    actorId: session!.userId,
    action: 'page.create',
    resource: 'pages',
    resourceId: item._id.toString(),
    metadata: { slug: item.slug },
    ip,
    tenantId: DEFAULT_TENANT_ID,
  });

  invalidateCatalogCache(DEFAULT_TENANT_ID);
  return serializePage(item);
}

export async function updatePage(
  session: AuthSession | null,
  id: string,
  body: unknown,
  ip?: string,
) {
  requirePermission(session, 'pages:update');
  const input = updatePageSchema.parse(body);

  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is required');
  await connectDatabase(uri);
  const { Page } = getModels();

  const item = await Page.findOne({ _id: id, tenantId: DEFAULT_TENANT_ID });
  if (!item) throw new AuthError('Page not found', 404);

  if (input.slug && input.slug !== item.slug) {
    const existing = await Page.findOne({ slug: input.slug, tenantId: DEFAULT_TENANT_ID });
    if (existing) throw new AuthError('Page slug already exists', 409);
    item.slug = input.slug;
  }

  if (input.title !== undefined) item.title = input.title;
  if (input.handle !== undefined) item.handle = input.handle;
  if (input.parentId !== undefined) item.parentId = input.parentId as never;
  if (input.templateSuffix !== undefined) item.templateSuffix = input.templateSuffix;
  if (input.body !== undefined) item.body = input.body;
  if (input.seo !== undefined) item.seo = input.seo as never;
  if (input.status !== undefined) item.status = input.status;
  if (input.scheduledAt !== undefined) {
    item.scheduledAt = input.scheduledAt ? new Date(input.scheduledAt) : undefined;
  }

  await item.save();

  await logAuditEvent({
    actorId: session!.userId,
    action: 'page.update',
    resource: 'pages',
    resourceId: id,
    ip,
    tenantId: DEFAULT_TENANT_ID,
  });

  invalidateCatalogCache(DEFAULT_TENANT_ID);
  return serializePage(item);
}

export async function deletePage(session: AuthSession | null, id: string, ip?: string) {
  requirePermission(session, 'pages:delete');
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is required');
  await connectDatabase(uri);
  const { Page } = getModels();

  const item = await Page.findOneAndDelete({ _id: id, tenantId: DEFAULT_TENANT_ID });
  if (!item) throw new AuthError('Page not found', 404);

  await logAuditEvent({
    actorId: session!.userId,
    action: 'page.delete',
    resource: 'pages',
    resourceId: id,
    ip,
    tenantId: DEFAULT_TENANT_ID,
  });

  invalidateCatalogCache(DEFAULT_TENANT_ID);
  return { success: true };
}

export async function publishPage(
  session: AuthSession | null,
  id: string,
  body: unknown,
  ip?: string,
) {
  requirePermission(session, 'pages:update');
  const input = publishPageSchema.parse(body ?? {});

  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is required');
  await connectDatabase(uri);
  const { Page } = getModels();

  const item = await Page.findOne({ _id: id, tenantId: DEFAULT_TENANT_ID });
  if (!item) throw new AuthError('Page not found', 404);

  if (input.scheduledAt) {
    item.status = 'scheduled';
    item.scheduledAt = new Date(input.scheduledAt);
  } else {
    item.status = 'published';
    item.publishedAt = new Date();
    item.scheduledAt = undefined;
  }

  await item.save();

  await logAuditEvent({
    actorId: session!.userId,
    action: 'page.publish',
    resource: 'pages',
    resourceId: id,
    metadata: { status: item.status },
    ip,
    tenantId: DEFAULT_TENANT_ID,
  });

  return serializePage(item);
}

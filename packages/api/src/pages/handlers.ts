import {
  createPageSchema,
  DEFAULT_TENANT_ID,
  normalizePublication,
  pageParentError,
  pageStatusSchema,
  PAGE_SNAPSHOT_FIELDS,
  paginationSchema,
  publicPathsById,
  publishPageSchema,
  slugToHandle,
  snapshotPageContent,
  updatePageSchema,
  type PageSnapshot,
  type PageStatus,
} from '@zodyk/core';
import { AuthError, logAuditEvent, requirePermission, type AuthSession } from '@zodyk/auth';
import {
  connectDatabase,
  deleteContentRevisions,
  findContentRevision,
  getModels,
  listContentRevisionDocs,
  promoteDueScheduledContent,
  recordContentRevision,
} from '@zodyk/database';
import { Types } from 'mongoose';
import { presentRevisionDetail, presentRevisionList } from '../revisions/present';
import { invalidateCatalogCache } from '../themes/catalog-cache';
import { invalidateWebsiteCache } from '../website-cache';
import { loadPagePathNodes, publicPathFor } from './paths';

type PageLike = {
  _id: { toString(): string };
  title: string;
  slug: string;
  handle: string;
  parentId?: { toString(): string } | null;
  templateSuffix?: string | null;
  body?: string | null;
  seo?: {
    metaTitle?: string;
    metaDescription?: string;
    ogImage?: string;
    canonicalUrl?: string;
  } | null;
  status: string;
  publishedAt?: Date | null;
  scheduledAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

function serializePage(item: PageLike, path?: string) {
  return {
    id: item._id.toString(),
    title: item.title,
    slug: item.slug,
    handle: item.handle,
    parentId: item.parentId?.toString() ?? null,
    path: path ?? `/${item.slug}`,
    templateSuffix: item.templateSuffix ?? undefined,
    body: item.body ?? undefined,
    seo: item.seo ?? {},
    status: item.status,
    publishedAt: item.publishedAt ?? undefined,
    scheduledAt: item.scheduledAt ?? undefined,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

async function connect() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is required');
  await connectDatabase(uri);
  await promoteDueScheduledContent();
}

async function unsetPageFields(id: string, fields: Record<string, 1>) {
  if (Object.keys(fields).length === 0) return;
  const { Page } = getModels();
  await Page.updateOne({ _id: id }, { $unset: fields });
}

function snapshotOf(item: PageLike, unset: Record<string, 1> = {}) {
  return snapshotPageContent({
    title: item.title,
    slug: item.slug,
    handle: item.handle,
    parentId: unset.parentId ? null : item.parentId,
    templateSuffix: unset.templateSuffix ? null : item.templateSuffix,
    body: item.body,
    seo: item.seo,
    status: item.status,
    publishedAt: unset.publishedAt ? null : item.publishedAt,
    scheduledAt: unset.scheduledAt ? null : item.scheduledAt,
  });
}

async function rememberPage(
  item: PageLike,
  actorId: string | undefined,
  unset: Record<string, 1> = {},
) {
  await recordContentRevision({
    resourceType: 'page',
    resourceId: item._id.toString(),
    snapshot: snapshotOf(item, unset),
    createdBy: actorId,
  });
}

async function requireParent(pageId: string | null, parentId: string | null) {
  if (!parentId) return;
  if (!Types.ObjectId.isValid(parentId)) throw new AuthError('Invalid parent page', 400);
  const nodes = await loadPagePathNodes();
  const error = pageParentError(pageId, parentId, nodes);
  if (error) throw new AuthError(error, 400);
}

function applyPublication(
  item: {
    status: string;
    set(path: string, value: unknown): void;
  },
  next: { status: PageStatus; publishedAt: string | null; scheduledAt: string | null },
  unset: Record<string, 1>,
) {
  item.status = next.status;
  if (next.publishedAt) {
    item.set('publishedAt', new Date(next.publishedAt));
    delete unset.publishedAt;
  } else if (next.status === 'scheduled') {
    unset.publishedAt = 1;
  }
  if (next.scheduledAt) {
    item.set('scheduledAt', new Date(next.scheduledAt));
    delete unset.scheduledAt;
  } else {
    unset.scheduledAt = 1;
  }
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
  if (status && !pageStatusSchema.safeParse(status).success) {
    throw new AuthError('Invalid status filter', 400);
  }

  await connect();
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
  const [items, total, nodes] = await Promise.all([
    Page.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(limit).lean(),
    Page.countDocuments(filter),
    loadPagePathNodes(),
  ]);
  const paths = publicPathsById(nodes);

  return {
    data: items.map((item) => serializePage(item, paths.get(item._id.toString()))),
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  };
}

export async function listPageOptions(session: AuthSession | null) {
  requirePermission(session, 'pages:read');
  await connect();
  const nodes = await loadPagePathNodes();
  const paths = publicPathsById(nodes);
  return {
    data: nodes.map((node) => ({
      id: node.id,
      title: node.title,
      slug: node.slug,
      status: node.status,
      parentId: node.parentId,
      path: paths.get(node.id) ?? `/${node.slug}`,
    })),
  };
}

export async function getPage(session: AuthSession | null, id: string) {
  requirePermission(session, 'pages:read');
  await connect();
  const { Page } = getModels();

  const item = await Page.findOne({ _id: id, tenantId: DEFAULT_TENANT_ID }).lean();
  if (!item) throw new AuthError('Page not found', 404);
  const path = await publicPathFor({
    id: item._id.toString(),
    slug: item.slug,
    parentId: item.parentId,
  });
  return serializePage(item, path);
}

export async function createPage(session: AuthSession | null, body: unknown, ip?: string) {
  requirePermission(session, 'pages:create');
  const input = createPageSchema.parse(body);

  await connect();
  const { Page } = getModels();

  const existing = await Page.findOne({ slug: input.slug, tenantId: DEFAULT_TENANT_ID });
  if (existing) throw new AuthError('Page slug already exists', 409);
  await requireParent(null, input.parentId ?? null);

  const publication = normalizePublication({
    status: input.status,
    publishedAt: input.publishedAt,
    scheduledAt: input.scheduledAt,
  });

  const item = await Page.create({
    title: input.title,
    slug: input.slug,
    handle: input.handle ?? slugToHandle(input.slug),
    parentId: input.parentId || undefined,
    templateSuffix: input.templateSuffix || undefined,
    body: input.body,
    seo: input.seo ?? {},
    status: publication.status,
    publishedAt: publication.publishedAt ? new Date(publication.publishedAt) : undefined,
    scheduledAt: publication.scheduledAt ? new Date(publication.scheduledAt) : undefined,
    tenantId: DEFAULT_TENANT_ID,
  });

  await rememberPage(item, session?.userId);
  await logAuditEvent({
    actorId: session!.userId,
    action: 'page.create',
    resource: 'pages',
    resourceId: item._id.toString(),
    metadata: { slug: item.slug, status: item.status },
    ip,
    tenantId: DEFAULT_TENANT_ID,
  });

  invalidateCatalogCache(DEFAULT_TENANT_ID);
  await invalidateWebsiteCache();
  const path = await publicPathFor({
    id: item._id.toString(),
    slug: item.slug,
    parentId: item.parentId,
  });
  return serializePage(item, path);
}

export async function updatePage(
  session: AuthSession | null,
  id: string,
  body: unknown,
  ip?: string,
) {
  requirePermission(session, 'pages:update');
  const input = updatePageSchema.parse(body);

  await connect();
  const { Page } = getModels();

  const item = await Page.findOne({ _id: id, tenantId: DEFAULT_TENANT_ID });
  if (!item) throw new AuthError('Page not found', 404);

  if (input.slug && input.slug !== item.slug) {
    const existing = await Page.findOne({ slug: input.slug, tenantId: DEFAULT_TENANT_ID });
    if (existing) throw new AuthError('Page slug already exists', 409);
    item.slug = input.slug;
  }

  const unset: Record<string, 1> = {};
  if (input.title !== undefined) item.title = input.title;
  if (input.handle !== undefined) item.handle = input.handle;
  if (input.parentId !== undefined) {
    await requireParent(id, input.parentId);
    if (input.parentId) item.set('parentId', new Types.ObjectId(input.parentId));
    else unset.parentId = 1;
  }
  if (input.templateSuffix !== undefined) {
    if (input.templateSuffix) item.templateSuffix = input.templateSuffix;
    else unset.templateSuffix = 1;
  }
  if (input.body !== undefined) item.body = input.body;
  if (input.seo !== undefined) item.seo = input.seo;
  if (
    input.status !== undefined ||
    input.publishedAt !== undefined ||
    input.scheduledAt !== undefined
  ) {
    const next = normalizePublication({
      status: (input.status ?? item.status) as PageStatus,
      publishedAt:
        input.publishedAt === undefined
          ? item.publishedAt
            ? item.publishedAt.toISOString()
            : null
          : input.publishedAt,
      scheduledAt:
        input.scheduledAt === undefined
          ? item.scheduledAt
            ? item.scheduledAt.toISOString()
            : null
          : input.scheduledAt,
    });
    applyPublication(item, next, unset);
  }

  await item.save();
  await unsetPageFields(id, unset);
  await rememberPage(item, session?.userId, unset);

  await logAuditEvent({
    actorId: session!.userId,
    action: 'page.update',
    resource: 'pages',
    resourceId: id,
    ip,
    tenantId: DEFAULT_TENANT_ID,
  });

  invalidateCatalogCache(DEFAULT_TENANT_ID);
  await invalidateWebsiteCache();
  const path = await publicPathFor({
    id: item._id.toString(),
    slug: item.slug,
    parentId: unset.parentId ? null : item.parentId,
  });
  return serializePage(
    {
      ...item.toObject(),
      _id: item._id,
      parentId: unset.parentId ? null : item.parentId,
      templateSuffix: unset.templateSuffix ? null : item.templateSuffix,
      publishedAt: unset.publishedAt ? null : item.publishedAt,
      scheduledAt: unset.scheduledAt ? null : item.scheduledAt,
    },
    path,
  );
}

export async function deletePage(session: AuthSession | null, id: string, ip?: string) {
  requirePermission(session, 'pages:delete');
  await connect();
  const { Page } = getModels();

  const item = await Page.findOneAndDelete({ _id: id, tenantId: DEFAULT_TENANT_ID });
  if (!item) throw new AuthError('Page not found', 404);
  await deleteContentRevisions('page', id);

  await logAuditEvent({
    actorId: session!.userId,
    action: 'page.delete',
    resource: 'pages',
    resourceId: id,
    ip,
    tenantId: DEFAULT_TENANT_ID,
  });

  invalidateCatalogCache(DEFAULT_TENANT_ID);
  await invalidateWebsiteCache();
  return { success: true };
}

export async function archivePage(session: AuthSession | null, id: string, ip?: string) {
  requirePermission(session, 'pages:update');
  await connect();
  const { Page } = getModels();
  const item = await Page.findOne({ _id: id, tenantId: DEFAULT_TENANT_ID });
  if (!item) throw new AuthError('Page not found', 404);

  item.status = 'archived';
  const unset: Record<string, 1> = { scheduledAt: 1 };
  await item.save();
  await unsetPageFields(id, unset);
  await rememberPage(item, session?.userId, unset);

  await logAuditEvent({
    actorId: session!.userId,
    action: 'page.archive',
    resource: 'pages',
    resourceId: id,
    ip,
    tenantId: DEFAULT_TENANT_ID,
  });

  invalidateCatalogCache(DEFAULT_TENANT_ID);
  await invalidateWebsiteCache();
  const path = await publicPathFor({ id, slug: item.slug, parentId: item.parentId });
  return serializePage({ ...item.toObject(), _id: item._id, scheduledAt: null }, path);
}

export async function unarchivePage(session: AuthSession | null, id: string, ip?: string) {
  requirePermission(session, 'pages:update');
  await connect();
  const { Page } = getModels();
  const item = await Page.findOne({ _id: id, tenantId: DEFAULT_TENANT_ID });
  if (!item) throw new AuthError('Page not found', 404);

  item.status = 'draft';
  await item.save();
  await rememberPage(item, session?.userId);

  await logAuditEvent({
    actorId: session!.userId,
    action: 'page.unarchive',
    resource: 'pages',
    resourceId: id,
    ip,
    tenantId: DEFAULT_TENANT_ID,
  });

  invalidateCatalogCache(DEFAULT_TENANT_ID);
  await invalidateWebsiteCache();
  const path = await publicPathFor({ id, slug: item.slug, parentId: item.parentId });
  return serializePage(item, path);
}

export async function publishPage(
  session: AuthSession | null,
  id: string,
  body: unknown,
  ip?: string,
) {
  requirePermission(session, 'pages:update');
  const input = publishPageSchema.parse(body ?? {});

  await connect();
  const { Page } = getModels();

  const item = await Page.findOne({ _id: id, tenantId: DEFAULT_TENANT_ID });
  if (!item) throw new AuthError('Page not found', 404);

  const next = input.scheduledAt
    ? normalizePublication({
        status: 'scheduled',
        scheduledAt: input.scheduledAt,
        publishedAt: null,
      })
    : normalizePublication({
        status: 'published',
        publishedAt: input.publishedAt ?? null,
        scheduledAt: null,
      });
  const unset: Record<string, 1> = {};
  applyPublication(item, next, unset);
  await item.save();
  await unsetPageFields(id, unset);
  await rememberPage(item, session?.userId, unset);

  await logAuditEvent({
    actorId: session!.userId,
    action: 'page.publish',
    resource: 'pages',
    resourceId: id,
    metadata: { status: item.status },
    ip,
    tenantId: DEFAULT_TENANT_ID,
  });

  invalidateCatalogCache(DEFAULT_TENANT_ID);
  await invalidateWebsiteCache();
  const path = await publicPathFor({ id, slug: item.slug, parentId: item.parentId });
  return serializePage(
    {
      ...item.toObject(),
      _id: item._id,
      publishedAt: unset.publishedAt ? null : item.publishedAt,
      scheduledAt: unset.scheduledAt ? null : item.scheduledAt,
    },
    path,
  );
}

async function currentPageSnapshot(id: string) {
  const { Page } = getModels();
  const item = await Page.findOne({ _id: id, tenantId: DEFAULT_TENANT_ID });
  if (!item) throw new AuthError('Page not found', 404);
  return { item, snapshot: snapshotOf(item) };
}

export async function listPageRevisions(session: AuthSession | null, id: string) {
  requirePermission(session, 'pages:read');
  await connect();
  const { snapshot } = await currentPageSnapshot(id);
  const docs = await listContentRevisionDocs('page', id);
  return presentRevisionList(docs, snapshot);
}

export async function getPageRevision(session: AuthSession | null, id: string, revisionId: string) {
  requirePermission(session, 'pages:read');
  await connect();
  const { snapshot } = await currentPageSnapshot(id);
  const doc = await findContentRevision('page', id, revisionId);
  if (!doc) throw new AuthError('Revision not found', 404);
  return presentRevisionDetail(doc, snapshot, PAGE_SNAPSHOT_FIELDS, 'body');
}

export async function restorePageRevision(
  session: AuthSession | null,
  id: string,
  revisionId: string,
  ip?: string,
) {
  requirePermission(session, 'pages:update');
  await connect();
  const { Page } = getModels();
  const item = await Page.findOne({ _id: id, tenantId: DEFAULT_TENANT_ID });
  if (!item) throw new AuthError('Page not found', 404);
  const doc = await findContentRevision('page', id, revisionId);
  if (!doc) throw new AuthError('Revision not found', 404);

  const snapshot = doc.snapshot as PageSnapshot;
  if (snapshot.slug !== item.slug) {
    const existing = await Page.findOne({
      slug: snapshot.slug,
      tenantId: DEFAULT_TENANT_ID,
      _id: { $ne: item._id },
    });
    if (existing) throw new AuthError('Page slug already exists', 409);
  }
  await requireParent(id, snapshot.parentId);

  item.title = snapshot.title;
  item.slug = snapshot.slug;
  item.handle = snapshot.handle;
  item.body = snapshot.body;
  item.seo = snapshot.seo ?? {};
  item.status = snapshot.status as PageStatus;
  const unset: Record<string, 1> = {};
  if (snapshot.parentId) item.set('parentId', new Types.ObjectId(snapshot.parentId));
  else unset.parentId = 1;
  if (snapshot.templateSuffix) item.templateSuffix = snapshot.templateSuffix;
  else unset.templateSuffix = 1;
  if (snapshot.publishedAt) item.set('publishedAt', new Date(snapshot.publishedAt));
  else unset.publishedAt = 1;
  if (snapshot.scheduledAt) item.set('scheduledAt', new Date(snapshot.scheduledAt));
  else unset.scheduledAt = 1;

  await item.save();
  await unsetPageFields(id, unset);
  await promoteDueScheduledContent();
  const fresh = await Page.findOne({ _id: id, tenantId: DEFAULT_TENANT_ID });
  if (!fresh) throw new AuthError('Page not found', 404);
  await rememberPage(fresh, session?.userId);

  await logAuditEvent({
    actorId: session!.userId,
    action: 'page.restore',
    resource: 'pages',
    resourceId: id,
    metadata: { revision: doc.revision },
    ip,
    tenantId: DEFAULT_TENANT_ID,
  });

  invalidateCatalogCache(DEFAULT_TENANT_ID);
  await invalidateWebsiteCache();
  const path = await publicPathFor({
    id,
    slug: fresh.slug,
    parentId: fresh.parentId,
  });
  return serializePage(fresh, path);
}

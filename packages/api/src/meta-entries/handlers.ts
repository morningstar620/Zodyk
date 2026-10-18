import {
  createMetaEntrySchema,
  DEFAULT_TENANT_ID,
  generateEntryHandle,
  META_ENTRY_SNAPSHOT_FIELDS,
  normalizePublication,
  paginationSchema,
  publishMetaEntrySchema,
  snapshotMetaEntryContent,
  updateMetaEntrySchema,
  validateEntryData,
  type MetaEntrySnapshot,
} from '@zodyk/core';
import { AuthError, logAuditEvent, requirePermission, type AuthSession } from '@zodyk/auth';
import {
  connectDatabase,
  findContentRevision,
  getModels,
  listContentRevisionDocs,
  promoteDueScheduledContent,
  recordContentRevision,
} from '@zodyk/database';
import { Types } from 'mongoose';
import { presentRevisionDetail, presentRevisionList } from '../revisions/present';
import { invalidateWebsiteCache } from '../website-cache';

async function rememberEntry(
  item: {
    _id: { toString(): string };
    handle: string;
    templateSuffix?: string | null;
    status: string;
    locale: string;
    data?: Record<string, unknown> | null;
    translations?: Record<string, Record<string, unknown>> | null;
    publishedAt?: Date | null;
    scheduledAt?: Date | null;
  },
  actorId: string | undefined,
  cleared: { publishedAt?: boolean; scheduledAt?: boolean } = {},
) {
  await recordContentRevision({
    resourceType: 'meta_entry',
    resourceId: item._id.toString(),
    createdBy: actorId,
    snapshot: snapshotMetaEntryContent({
      handle: item.handle,
      templateSuffix: item.templateSuffix,
      status: item.status,
      locale: item.locale,
      data: item.data,
      translations: item.translations,
      publishedAt: cleared.publishedAt ? null : item.publishedAt,
      scheduledAt: cleared.scheduledAt ? null : item.scheduledAt,
    }),
  });
}

async function getDefinitionOrThrow(slug: string) {
  const { MetaObjectDefinition } = getModels();
  const def = await MetaObjectDefinition.findOne({
    slug: slug.toLowerCase(),
    tenantId: DEFAULT_TENANT_ID,
    status: 'active',
  });
  if (!def) throw new AuthError('Meta object not found', 404);
  return def;
}

async function validateRelations(
  fields: { key: string; type: string; settings?: { relation?: { targetSlug: string } } }[],
  data: Record<string, unknown>,
) {
  const { MetaObjectEntry } = getModels();
  const relationFields = fields.filter((f) => f.type === 'relation');

  for (const field of relationFields) {
    const targetSlug = field.settings?.relation?.targetSlug;
    if (!targetSlug) continue;

    const value = data[field.key];
    const ids = Array.isArray(value) ? value : value ? [value] : [];

    for (const id of ids) {
      if (typeof id !== 'string' || !Types.ObjectId.isValid(id)) {
        throw new AuthError(`Invalid relation ID for field ${field.key}`, 400);
      }
      const entry = await MetaObjectEntry.findOne({
        _id: id,
        metaObjectSlug: targetSlug,
        tenantId: DEFAULT_TENANT_ID,
        deletedAt: { $exists: false },
      });
      if (!entry) {
        throw new AuthError(`Related entry not found for field ${field.key}`, 400);
      }
    }
  }
}

export async function listMetaEntries(
  session: AuthSession | null,
  slug: string,
  params: Record<string, string | string[] | undefined>,
) {
  requirePermission(session, 'meta_entries:read');
  const { page, limit, search } = paginationSchema.parse({
    page: params.page,
    limit: params.limit,
    search: params.search,
  });
  const status = typeof params.status === 'string' ? params.status : undefined;

  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is required');
  await connectDatabase(uri);
  await promoteDueScheduledContent();
  await getDefinitionOrThrow(slug);
  const { MetaObjectEntry } = getModels();

  const filter: Record<string, unknown> = {
    tenantId: DEFAULT_TENANT_ID,
    metaObjectSlug: slug.toLowerCase(),
    deletedAt: { $exists: false },
  };
  if (status) filter.status = status;

  const skip = (page - 1) * limit;
  let items = await MetaObjectEntry.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  if (search) {
    const q = search.toLowerCase();
    items = items.filter((item) => JSON.stringify(item.data).toLowerCase().includes(q));
  }

  const total = await MetaObjectEntry.countDocuments(filter);

  return {
    data: items.map((item) => ({
      id: item._id.toString(),
      metaObjectSlug: item.metaObjectSlug,
      handle: item.handle,
      templateSuffix: item.templateSuffix,
      status: item.status,
      locale: item.locale,
      data: item.data,
      translations: item.translations,
      publishedAt: item.publishedAt,
      scheduledAt: item.scheduledAt,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    })),
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  };
}

export async function getMetaEntry(session: AuthSession | null, slug: string, id: string) {
  requirePermission(session, 'meta_entries:read');
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is required');
  await connectDatabase(uri);
  await promoteDueScheduledContent();
  await getDefinitionOrThrow(slug);
  const { MetaObjectEntry } = getModels();

  const item = await MetaObjectEntry.findOne({
    _id: id,
    metaObjectSlug: slug.toLowerCase(),
    tenantId: DEFAULT_TENANT_ID,
    deletedAt: { $exists: false },
  }).lean();

  if (!item) throw new AuthError('Entry not found', 404);

  return {
    id: item._id.toString(),
    metaObjectSlug: item.metaObjectSlug,
    handle: item.handle,
    templateSuffix: item.templateSuffix,
    status: item.status,
    locale: item.locale,
    data: item.data,
    translations: item.translations,
    publishedAt: item.publishedAt,
    scheduledAt: item.scheduledAt,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

export async function createMetaEntry(
  session: AuthSession | null,
  slug: string,
  body: unknown,
  ip?: string,
) {
  requirePermission(session, 'meta_entries:create');
  const input = createMetaEntrySchema.parse(body);

  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is required');
  await connectDatabase(uri);
  await promoteDueScheduledContent();
  const def = await getDefinitionOrThrow(slug);

  const validation = validateEntryData(def.fields, input.data);
  if (!validation.success) {
    throw new AuthError('Validation failed: ' + validation.error.message, 400);
  }

  await validateRelations(def.fields, validation.data);

  const handle = generateEntryHandle(validation.data, input.handle);

  const { MetaObjectEntry } = getModels();
  const existingHandle = await MetaObjectEntry.findOne({
    metaObjectSlug: slug.toLowerCase(),
    handle,
    tenantId: DEFAULT_TENANT_ID,
    deletedAt: { $exists: false },
  });
  if (existingHandle) throw new AuthError('Handle already exists for this meta object', 409);

  const publication = normalizePublication({
    status: input.status,
    publishedAt: null,
    scheduledAt: input.scheduledAt,
  });

  const item = await MetaObjectEntry.create({
    metaObjectSlug: slug.toLowerCase(),
    handle,
    templateSuffix: input.templateSuffix,
    status: publication.status,
    locale: input.locale,
    data: validation.data,
    translations: input.translations ?? {},
    publishedAt: publication.publishedAt ? new Date(publication.publishedAt) : undefined,
    scheduledAt: publication.scheduledAt ? new Date(publication.scheduledAt) : undefined,
    createdBy: session?.userId,
    updatedBy: session?.userId,
    tenantId: DEFAULT_TENANT_ID,
  });

  await rememberEntry(item, session?.userId);
  await invalidateWebsiteCache();

  await logAuditEvent({
    actorId: session!.userId,
    action: 'meta_entry.create',
    resource: 'meta_entries',
    resourceId: item._id.toString(),
    metadata: { slug, status: item.status },
    ip,
    tenantId: DEFAULT_TENANT_ID,
  });

  return {
    id: item._id.toString(),
    metaObjectSlug: item.metaObjectSlug,
    handle: item.handle,
    templateSuffix: item.templateSuffix,
    status: item.status,
    locale: item.locale,
    data: item.data,
    translations: item.translations,
  };
}

export async function updateMetaEntry(
  session: AuthSession | null,
  slug: string,
  id: string,
  body: unknown,
  ip?: string,
) {
  requirePermission(session, 'meta_entries:update');
  const input = updateMetaEntrySchema.parse(body);

  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is required');
  await connectDatabase(uri);
  await promoteDueScheduledContent();
  const def = await getDefinitionOrThrow(slug);
  const { MetaObjectEntry } = getModels();

  const item = await MetaObjectEntry.findOne({
    _id: id,
    metaObjectSlug: slug.toLowerCase(),
    tenantId: DEFAULT_TENANT_ID,
    deletedAt: { $exists: false },
  });
  if (!item) throw new AuthError('Entry not found', 404);

  if (input.data) {
    const validation = validateEntryData(def.fields, input.data);
    if (!validation.success) {
      throw new AuthError('Validation failed: ' + validation.error.message, 400);
    }
    await validateRelations(def.fields, validation.data);
    item.data = validation.data;
  }

  if (input.locale) item.locale = input.locale;
  if (input.status) item.status = input.status;
  if (input.templateSuffix !== undefined) {
    item.templateSuffix = input.templateSuffix ?? undefined;
  }
  if (input.handle) {
    const existingHandle = await MetaObjectEntry.findOne({
      metaObjectSlug: slug.toLowerCase(),
      handle: input.handle,
      tenantId: DEFAULT_TENANT_ID,
      deletedAt: { $exists: false },
      _id: { $ne: item._id },
    });
    if (existingHandle) throw new AuthError('Handle already exists for this meta object', 409);
    item.handle = input.handle;
  } else if (input.data) {
    item.handle = generateEntryHandle(item.data, item.handle);
  }
  if (input.translations) item.translations = input.translations;
  if (input.scheduledAt !== undefined) {
    item.scheduledAt = input.scheduledAt ? new Date(input.scheduledAt) : undefined;
  }
  item.updatedBy = session?.userId as unknown as typeof item.updatedBy;

  await item.save();
  if (input.scheduledAt === null) {
    await MetaObjectEntry.updateOne({ _id: item._id }, { $unset: { scheduledAt: 1 } });
  }
  await rememberEntry(item, session?.userId, { scheduledAt: input.scheduledAt === null });
  await invalidateWebsiteCache();

  await logAuditEvent({
    actorId: session!.userId,
    action: 'meta_entry.update',
    resource: 'meta_entries',
    resourceId: id,
    metadata: { slug },
    ip,
    tenantId: DEFAULT_TENANT_ID,
  });

  return {
    id: item._id.toString(),
    metaObjectSlug: item.metaObjectSlug,
    handle: item.handle,
    templateSuffix: item.templateSuffix,
    status: item.status,
    locale: item.locale,
    data: item.data,
    translations: item.translations,
  };
}

export async function deleteMetaEntry(
  session: AuthSession | null,
  slug: string,
  id: string,
  ip?: string,
) {
  requirePermission(session, 'meta_entries:delete');

  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is required');
  await connectDatabase(uri);
  await promoteDueScheduledContent();
  const { MetaObjectEntry } = getModels();

  const item = await MetaObjectEntry.findOneAndUpdate(
    {
      _id: id,
      metaObjectSlug: slug.toLowerCase(),
      tenantId: DEFAULT_TENANT_ID,
      deletedAt: { $exists: false },
    },
    { status: 'archived', deletedAt: new Date() },
    { new: true },
  );
  if (!item) throw new AuthError('Entry not found', 404);

  await logAuditEvent({
    actorId: session!.userId,
    action: 'meta_entry.delete',
    resource: 'meta_entries',
    resourceId: id,
    metadata: { slug },
    ip,
    tenantId: DEFAULT_TENANT_ID,
  });

  return { success: true };
}

export async function publishMetaEntry(
  session: AuthSession | null,
  slug: string,
  id: string,
  body: unknown,
  ip?: string,
) {
  requirePermission(session, 'meta_entries:publish');
  const input = publishMetaEntrySchema.parse(body ?? {});

  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is required');
  await connectDatabase(uri);
  await promoteDueScheduledContent();
  const { MetaObjectEntry } = getModels();

  const item = await MetaObjectEntry.findOne({
    _id: id,
    metaObjectSlug: slug.toLowerCase(),
    tenantId: DEFAULT_TENANT_ID,
    deletedAt: { $exists: false },
  });
  if (!item) throw new AuthError('Entry not found', 404);

  const next = input.scheduledAt
    ? normalizePublication({
        status: 'scheduled',
        scheduledAt: input.scheduledAt,
        publishedAt: null,
      })
    : normalizePublication({ status: 'published', publishedAt: null, scheduledAt: null });
  item.status = next.status;
  if (next.publishedAt) item.publishedAt = new Date(next.publishedAt);
  if (next.scheduledAt) item.scheduledAt = new Date(next.scheduledAt);
  else item.scheduledAt = undefined;
  item.updatedBy = session?.userId as unknown as typeof item.updatedBy;
  await item.save();
  if (!next.scheduledAt) {
    await MetaObjectEntry.updateOne({ _id: item._id }, { $unset: { scheduledAt: 1 } });
  }
  await rememberEntry(item, session?.userId, { scheduledAt: !next.scheduledAt });
  await invalidateWebsiteCache();

  await logAuditEvent({
    actorId: session!.userId,
    action: 'meta_entry.publish',
    resource: 'meta_entries',
    resourceId: id,
    metadata: { slug, status: item.status },
    ip,
    tenantId: DEFAULT_TENANT_ID,
  });

  return {
    id: item._id.toString(),
    status: item.status,
    publishedAt: next.publishedAt ? item.publishedAt : undefined,
    scheduledAt: next.scheduledAt ? item.scheduledAt : undefined,
  };
}

async function loadMetaEntry(slug: string, id: string) {
  const { MetaObjectEntry } = getModels();
  const item = await MetaObjectEntry.findOne({
    _id: id,
    metaObjectSlug: slug.toLowerCase(),
    tenantId: DEFAULT_TENANT_ID,
    deletedAt: { $exists: false },
  });
  if (!item) throw new AuthError('Entry not found', 404);
  return item;
}

export async function listMetaEntryRevisions(
  session: AuthSession | null,
  slug: string,
  id: string,
) {
  requirePermission(session, 'meta_entries:read');
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is required');
  await connectDatabase(uri);
  await promoteDueScheduledContent();
  await getDefinitionOrThrow(slug);
  const item = await loadMetaEntry(slug, id);
  const docs = await listContentRevisionDocs('meta_entry', id);
  return presentRevisionList(
    docs,
    snapshotMetaEntryContent({
      handle: item.handle,
      templateSuffix: item.templateSuffix,
      status: item.status,
      locale: item.locale,
      data: item.data,
      translations: item.translations,
      publishedAt: item.publishedAt,
      scheduledAt: item.scheduledAt,
    }),
  );
}

export async function getMetaEntryRevision(
  session: AuthSession | null,
  slug: string,
  id: string,
  revisionId: string,
) {
  requirePermission(session, 'meta_entries:read');
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is required');
  await connectDatabase(uri);
  await promoteDueScheduledContent();
  await getDefinitionOrThrow(slug);
  const item = await loadMetaEntry(slug, id);
  const doc = await findContentRevision('meta_entry', id, revisionId);
  if (!doc) throw new AuthError('Revision not found', 404);
  return presentRevisionDetail(
    doc,
    snapshotMetaEntryContent({
      handle: item.handle,
      templateSuffix: item.templateSuffix,
      status: item.status,
      locale: item.locale,
      data: item.data,
      translations: item.translations,
      publishedAt: item.publishedAt,
      scheduledAt: item.scheduledAt,
    }),
    META_ENTRY_SNAPSHOT_FIELDS,
    'data',
  );
}

export async function restoreMetaEntryRevision(
  session: AuthSession | null,
  slug: string,
  id: string,
  revisionId: string,
  ip?: string,
) {
  requirePermission(session, 'meta_entries:update');
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is required');
  await connectDatabase(uri);
  await promoteDueScheduledContent();
  await getDefinitionOrThrow(slug);
  const { MetaObjectEntry } = getModels();
  const item = await loadMetaEntry(slug, id);
  const doc = await findContentRevision('meta_entry', id, revisionId);
  if (!doc) throw new AuthError('Revision not found', 404);
  const snapshot = doc.snapshot as MetaEntrySnapshot;

  if (snapshot.handle !== item.handle) {
    const existingHandle = await MetaObjectEntry.findOne({
      metaObjectSlug: slug.toLowerCase(),
      handle: snapshot.handle,
      tenantId: DEFAULT_TENANT_ID,
      deletedAt: { $exists: false },
      _id: { $ne: item._id },
    });
    if (existingHandle) throw new AuthError('Handle already exists for this meta object', 409);
  }

  item.handle = snapshot.handle;
  item.templateSuffix = snapshot.templateSuffix ?? undefined;
  item.status = snapshot.status as typeof item.status;
  item.locale = snapshot.locale;
  item.data = snapshot.data ?? {};
  item.translations = snapshot.translations ?? {};
  if (snapshot.publishedAt) item.publishedAt = new Date(snapshot.publishedAt);
  if (snapshot.scheduledAt) item.scheduledAt = new Date(snapshot.scheduledAt);
  else item.scheduledAt = undefined;
  item.updatedBy = session?.userId as unknown as typeof item.updatedBy;
  await item.save();
  if (!snapshot.scheduledAt) {
    await MetaObjectEntry.updateOne({ _id: item._id }, { $unset: { scheduledAt: 1 } });
  }
  if (!snapshot.publishedAt) {
    await MetaObjectEntry.updateOne({ _id: item._id }, { $unset: { publishedAt: 1 } });
  }
  await promoteDueScheduledContent();
  const fresh = await loadMetaEntry(slug, id);
  await rememberEntry(fresh, session?.userId);
  await invalidateWebsiteCache();

  await logAuditEvent({
    actorId: session!.userId,
    action: 'meta_entry.restore',
    resource: 'meta_entries',
    resourceId: id,
    metadata: { slug, revision: doc.revision },
    ip,
    tenantId: DEFAULT_TENANT_ID,
  });

  return {
    id: fresh._id.toString(),
    metaObjectSlug: fresh.metaObjectSlug,
    handle: fresh.handle,
    templateSuffix: fresh.templateSuffix,
    status: fresh.status,
    locale: fresh.locale,
    data: fresh.data,
    translations: fresh.translations,
    publishedAt: fresh.publishedAt,
    scheduledAt: fresh.scheduledAt,
  };
}

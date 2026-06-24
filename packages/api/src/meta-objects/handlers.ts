import {
  createMetaObjectSchema,
  DEFAULT_TENANT_ID,
  defaultMetaObjectRouting,
  defaultMetaObjectTemplates,
  ensureSeoGroupOnUpdate,
  paginationSchema,
  slugToHandle,
  updateMetaObjectSchema,
} from '@zodyk/core';
import { AuthError, logAuditEvent, requirePermission, type AuthSession } from '@zodyk/auth';
import { connectDatabase, getModels } from '@zodyk/database';

export async function listMetaObjects(session: AuthSession | null) {
  requirePermission(session, 'meta_objects:read');
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is required');
  await connectDatabase(uri);
  const { MetaObjectDefinition } = getModels();

  const items = await MetaObjectDefinition.find({ tenantId: DEFAULT_TENANT_ID })
    .sort({ name: 1 })
    .lean();

  return items.map((item) => ({
    id: item._id.toString(),
    name: item.name,
    slug: item.slug,
    singularName: item.singularName,
    description: item.description,
    fieldGroups: item.fieldGroups,
    fields: item.fields,
    status: item.status,
    isSystem: item.isSystem,
    routing: item.routing,
    templates: item.templates,
    display: item.display,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  }));
}

export async function getMetaObject(session: AuthSession | null, slug: string) {
  requirePermission(session, 'meta_objects:read');
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is required');
  await connectDatabase(uri);
  const { MetaObjectDefinition } = getModels();

  const item = await MetaObjectDefinition.findOne({
    slug: slug.toLowerCase(),
    tenantId: DEFAULT_TENANT_ID,
  }).lean();

  if (!item) throw new AuthError('Meta object not found', 404);

  return {
    id: item._id.toString(),
    name: item.name,
    slug: item.slug,
    singularName: item.singularName,
    description: item.description,
    fieldGroups: item.fieldGroups,
    fields: item.fields,
    status: item.status,
    isSystem: item.isSystem,
    routing: item.routing,
    templates: item.templates,
    display: item.display,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

export async function createMetaObject(
  session: AuthSession | null,
  body: unknown,
  ip?: string,
) {
  requirePermission(session, 'meta_objects:create');
  const parsed = createMetaObjectSchema.parse(body);

  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is required');
  await connectDatabase(uri);
  const { MetaObjectDefinition } = getModels();

  const existing = await MetaObjectDefinition.findOne({
    slug: parsed.slug,
    tenantId: DEFAULT_TENANT_ID,
  });
  if (existing) throw new AuthError('Slug already exists', 409);

  const item = await MetaObjectDefinition.create({
    name: parsed.name,
    slug: parsed.slug,
    singularName: parsed.singularName ?? parsed.name,
    description: parsed.description,
    fieldGroups: parsed.fieldGroups,
    fields: parsed.fields,
    status: parsed.status,
    routing: parsed.routing ?? defaultMetaObjectRouting(parsed.slug),
    templates: parsed.templates ?? defaultMetaObjectTemplates(parsed.slug),
    display: parsed.display ?? {
      archiveFields: [],
      archiveSort: '-createdAt',
      archivePageSize: 12,
    },
    tenantId: DEFAULT_TENANT_ID,
  });

  await logAuditEvent({
    actorId: session!.userId,
    action: 'meta_object.create',
    resource: 'meta_objects',
    resourceId: item.slug,
    metadata: { name: item.name },
    ip,
    tenantId: DEFAULT_TENANT_ID,
  });

  return {
    id: item._id.toString(),
    name: item.name,
    slug: item.slug,
    singularName: item.singularName,
    description: item.description,
    fieldGroups: item.fieldGroups,
    fields: item.fields,
    status: item.status,
    isSystem: item.isSystem,
    routing: item.routing,
    templates: item.templates,
    display: item.display,
  };
}

export async function updateMetaObject(
  session: AuthSession | null,
  slug: string,
  body: unknown,
  ip?: string,
) {
  requirePermission(session, 'meta_objects:update');
  const input = updateMetaObjectSchema.parse(body);

  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is required');
  await connectDatabase(uri);
  const { MetaObjectDefinition } = getModels();

  const item = await MetaObjectDefinition.findOne({
    slug: slug.toLowerCase(),
    tenantId: DEFAULT_TENANT_ID,
  });
  if (!item) throw new AuthError('Meta object not found', 404);

  if (input.name) item.name = input.name;
  if (input.singularName) item.singularName = input.singularName;
  if (input.description !== undefined) item.description = input.description;
  if (input.status) item.status = input.status;
  if (input.routing) item.routing = { ...item.routing, ...input.routing };
  if (input.templates) item.templates = { ...item.templates, ...input.templates };
  if (input.display) item.display = { ...item.display, ...input.display };

  if (input.fieldGroups || input.fields) {
    const merged = ensureSeoGroupOnUpdate(
      input.fieldGroups ?? item.fieldGroups,
      input.fields ?? item.fields,
    );
    item.fieldGroups = merged.fieldGroups;
    item.fields = merged.fields;
  }

  await item.save();

  await logAuditEvent({
    actorId: session!.userId,
    action: 'meta_object.update',
    resource: 'meta_objects',
    resourceId: item.slug,
    metadata: input,
    ip,
    tenantId: DEFAULT_TENANT_ID,
  });

  return {
    id: item._id.toString(),
    name: item.name,
    slug: item.slug,
    singularName: item.singularName,
    description: item.description,
    fieldGroups: item.fieldGroups,
    fields: item.fields,
    status: item.status,
    isSystem: item.isSystem,
    routing: item.routing,
    templates: item.templates,
    display: item.display,
  };
}

export async function deleteMetaObject(
  session: AuthSession | null,
  slug: string,
  ip?: string,
) {
  requirePermission(session, 'meta_objects:delete');
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is required');
  await connectDatabase(uri);
  const { MetaObjectDefinition, MetaObjectEntry } = getModels();

  const item = await MetaObjectDefinition.findOne({
    slug: slug.toLowerCase(),
    tenantId: DEFAULT_TENANT_ID,
  });
  if (!item) throw new AuthError('Meta object not found', 404);
  if (item.isSystem) throw new AuthError('Cannot delete system meta object', 400);

  const entryCount = await MetaObjectEntry.countDocuments({
    metaObjectSlug: item.slug,
    tenantId: DEFAULT_TENANT_ID,
    deletedAt: { $exists: false },
  });
  if (entryCount > 0) {
    throw new AuthError('Cannot delete meta object with existing entries', 400);
  }

  await MetaObjectDefinition.deleteOne({ _id: item._id });

  await logAuditEvent({
    actorId: session!.userId,
    action: 'meta_object.delete',
    resource: 'meta_objects',
    resourceId: slug,
    ip,
    tenantId: DEFAULT_TENANT_ID,
  });

  return { success: true };
}

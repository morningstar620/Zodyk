import {
  createSystemEntitySchema,
  DEFAULT_TENANT_ID,
  ensureSystemGroupOnUpdate,
  updateSystemEntitySchema,
  bulkSystemRecordActionSchema,
  createSystemRecordSchema,
  updateSystemRecordSchema,
  systemEntityPermissions,
} from '@zodyk/core';
import { AuthError, logAuditEvent, requirePermission, type AuthSession } from '@zodyk/auth';
import {
  connectDatabase,
  ensureEntityIndexes,
  getSystemEntityRepository,
} from '@zodyk/database';
import {
  getDefinitionOrThrow,
  parseListParams,
  toRecordDto,
  toSystemEntityDefinitionDto,
  validateEntityReferences,
  validateRecordData,
  validateUniqueFields,
} from '../entities/engine';

const repository = getSystemEntityRepository();

async function connect() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is required');
  await connectDatabase(uri);
}

async function syncIndexes(slug: string, fields: import('@zodyk/core').MetaFieldDefinition[]) {
  await ensureEntityIndexes(
    repository.getRecordModel() as unknown as import('mongoose').Model<Record<string, unknown>>,
    DEFAULT_TENANT_ID,
    slug,
    fields,
  );
}

export async function listSystemEntities(session: AuthSession | null) {
  requirePermission(session, 'system_entities:read');
  await connect();

  const items = await repository.listDefinitions(DEFAULT_TENANT_ID);
  return items.map(toSystemEntityDefinitionDto);
}

export async function getSystemEntity(session: AuthSession | null, slug: string) {
  requirePermission(session, 'system_entities:read');
  await connect();

  const item = await repository.getDefinition(DEFAULT_TENANT_ID, slug);
  if (!item) throw new AuthError('System entity not found', 404);
  return toSystemEntityDefinitionDto(item);
}

export async function createSystemEntity(
  session: AuthSession | null,
  body: unknown,
  ip?: string,
) {
  requirePermission(session, 'system_entities:create');
  const parsed = createSystemEntitySchema.parse(body);
  await connect();

  const existing = await repository.getDefinition(DEFAULT_TENANT_ID, parsed.slug);
  if (existing) throw new AuthError('Slug already exists', 409);

  const item = await repository.createDefinition(DEFAULT_TENANT_ID, {
    name: parsed.name,
    slug: parsed.slug,
    icon: parsed.icon,
    description: parsed.description,
    color: parsed.color,
    singularLabel: parsed.singularLabel,
    pluralLabel: parsed.pluralLabel,
    enabled: parsed.enabled,
    systemCategory: parsed.systemCategory,
    defaultView: parsed.defaultView,
    behaviors: parsed.behaviors,
    fieldGroups: parsed.fieldGroups,
    fields: parsed.fields,
    relationships: parsed.relationships,
    display: parsed.display,
    status: parsed.status,
    isSystem: false,
  });

  await syncIndexes(parsed.slug, parsed.fields);

  await logAuditEvent({
    actorId: session!.userId,
    action: 'system_entity.create',
    resource: 'system_entities',
    resourceId: parsed.slug,
    metadata: { name: parsed.name, permissions: systemEntityPermissions(parsed.slug) },
    ip,
    tenantId: DEFAULT_TENANT_ID,
  });

  return toSystemEntityDefinitionDto(item);
}

export async function updateSystemEntity(
  session: AuthSession | null,
  slug: string,
  body: unknown,
  ip?: string,
) {
  requirePermission(session, 'system_entities:update');
  const input = updateSystemEntitySchema.parse(body);
  await connect();

  const existing = await repository.getDefinition(DEFAULT_TENANT_ID, slug);
  if (!existing) throw new AuthError('System entity not found', 404);

  const updateData: Record<string, unknown> = {};
  if (input.name !== undefined) updateData.name = input.name;
  if (input.icon !== undefined) updateData.icon = input.icon ?? undefined;
  if (input.description !== undefined) updateData.description = input.description ?? undefined;
  if (input.color !== undefined) updateData.color = input.color ?? undefined;
  if (input.singularLabel !== undefined) updateData.singularLabel = input.singularLabel;
  if (input.pluralLabel !== undefined) updateData.pluralLabel = input.pluralLabel;
  if (input.enabled !== undefined) updateData.enabled = input.enabled;
  if (input.systemCategory !== undefined) updateData.systemCategory = input.systemCategory ?? undefined;
  if (input.defaultView !== undefined) updateData.defaultView = input.defaultView;
  if (input.behaviors !== undefined) updateData.behaviors = input.behaviors;
  if (input.relationships !== undefined) updateData.relationships = input.relationships;
  if (input.display !== undefined) updateData.display = input.display;
  if (input.status !== undefined) updateData.status = input.status;

  if (input.fieldGroups || input.fields) {
    const merged = ensureSystemGroupOnUpdate(
      input.fieldGroups ?? (existing.fieldGroups as never),
      input.fields ?? existing.fields,
    );
    updateData.fieldGroups = merged.fieldGroups;
    updateData.fields = merged.fields;
  }

  const item = await repository.updateDefinition(DEFAULT_TENANT_ID, slug, updateData);
  if (!item) throw new AuthError('System entity not found', 404);

  await syncIndexes(slug, item.fields);

  await logAuditEvent({
    actorId: session!.userId,
    action: 'system_entity.update',
    resource: 'system_entities',
    resourceId: slug,
    metadata: input,
    ip,
    tenantId: DEFAULT_TENANT_ID,
  });

  return toSystemEntityDefinitionDto(item);
}

export async function deleteSystemEntity(
  session: AuthSession | null,
  slug: string,
  ip?: string,
) {
  requirePermission(session, 'system_entities:delete');
  await connect();

  const item = await repository.getDefinition(DEFAULT_TENANT_ID, slug);
  if (!item) throw new AuthError('System entity not found', 404);
  if (item.isSystem) throw new AuthError('Cannot delete system entity', 400);

  const recordCount = await repository.countRecords(DEFAULT_TENANT_ID, slug);
  if (recordCount > 0) {
    throw new AuthError('Cannot delete system entity with existing records', 400);
  }

  await repository.deleteDefinition(DEFAULT_TENANT_ID, slug);

  await logAuditEvent({
    actorId: session!.userId,
    action: 'system_entity.delete',
    resource: 'system_entities',
    resourceId: slug,
    ip,
    tenantId: DEFAULT_TENANT_ID,
  });

  return { success: true };
}

function requireRecordPermission(session: AuthSession | null, slug: string, action: keyof ReturnType<typeof systemEntityPermissions>) {
  const perms = systemEntityPermissions(slug);
  requirePermission(session, perms[action]);
  requirePermission(session, `system_records:${action}`);
}

export async function listSystemRecords(
  session: AuthSession | null,
  slug: string,
  params: Record<string, string | string[] | undefined>,
) {
  requirePermission(session, 'system_records:read');
  requireRecordPermission(session, slug, 'read');
  await connect();

  const def = await getDefinitionOrThrow(repository, slug);
  const { page, limit, search, status, sort, filters } = parseListParams(params);

  const { items, total } = await repository.listRecords({
    tenantId: DEFAULT_TENANT_ID,
    slug,
    page,
    limit,
    search,
    status,
    sort: sort ?? (def.display as { defaultSort?: string })?.defaultSort ?? '-createdAt',
    filters,
  });

  return {
    data: items.map((item) => toRecordDto(item, slug)),
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  };
}

export async function getSystemRecord(session: AuthSession | null, slug: string, id: string) {
  requirePermission(session, 'system_records:read');
  requireRecordPermission(session, slug, 'read');
  await connect();
  await getDefinitionOrThrow(repository, slug);

  const item = await repository.getRecord(DEFAULT_TENANT_ID, slug, id);
  if (!item) throw new AuthError('Record not found', 404);
  return toRecordDto(item, slug);
}

export async function createSystemRecord(
  session: AuthSession | null,
  slug: string,
  body: unknown,
  ip?: string,
) {
  requirePermission(session, 'system_records:create');
  requireRecordPermission(session, slug, 'create');
  const input = createSystemRecordSchema.parse(body);
  await connect();

  const def = await getDefinitionOrThrow(repository, slug);
  const validatedData = await validateRecordData(def.fields, input.data);
  await validateEntityReferences(def.fields, validatedData);
  await validateUniqueFields(repository, def.fields, validatedData, slug, DEFAULT_TENANT_ID);

  const item = await repository.createRecord(DEFAULT_TENANT_ID, slug, {
    status: input.status,
    data: validatedData,
    createdBy: session?.userId,
    updatedBy: session?.userId,
  });

  await logAuditEvent({
    actorId: session!.userId,
    action: 'system_record.create',
    resource: 'system_records',
    resourceId: item._id?.toString(),
    metadata: { slug, status: input.status },
    ip,
    tenantId: DEFAULT_TENANT_ID,
  });

  return toRecordDto(item, slug);
}

export async function updateSystemRecord(
  session: AuthSession | null,
  slug: string,
  id: string,
  body: unknown,
  ip?: string,
) {
  requirePermission(session, 'system_records:update');
  requireRecordPermission(session, slug, 'update');
  const input = updateSystemRecordSchema.parse(body);
  await connect();

  const def = await getDefinitionOrThrow(repository, slug);
  const existing = await repository.getRecord(DEFAULT_TENANT_ID, slug, id);
  if (!existing) throw new AuthError('Record not found', 404);

  const updateData: Record<string, unknown> = { updatedBy: session?.userId };
  if (input.status !== undefined) updateData.status = input.status;

  if (input.data) {
    const validatedData = await validateRecordData(def.fields, input.data);
    await validateEntityReferences(def.fields, validatedData);
    await validateUniqueFields(
      repository,
      def.fields,
      validatedData,
      slug,
      DEFAULT_TENANT_ID,
      id,
    );
    updateData.data = validatedData;
  }

  const item = await repository.updateRecord(DEFAULT_TENANT_ID, slug, id, updateData);
  if (!item) throw new AuthError('Record not found', 404);

  await logAuditEvent({
    actorId: session!.userId,
    action: 'system_record.update',
    resource: 'system_records',
    resourceId: id,
    metadata: { slug },
    ip,
    tenantId: DEFAULT_TENANT_ID,
  });

  return toRecordDto(item, slug);
}

export async function deleteSystemRecord(
  session: AuthSession | null,
  slug: string,
  id: string,
  ip?: string,
) {
  requirePermission(session, 'system_records:delete');
  requireRecordPermission(session, slug, 'delete');
  await connect();
  await getDefinitionOrThrow(repository, slug);

  const def = await repository.getDefinition(DEFAULT_TENANT_ID, slug);
  const softDelete = def?.behaviors?.soft_delete !== false;

  const deleted = await repository.deleteRecord(DEFAULT_TENANT_ID, slug, id, softDelete);
  if (!deleted) throw new AuthError('Record not found', 404);

  await logAuditEvent({
    actorId: session!.userId,
    action: 'system_record.delete',
    resource: 'system_records',
    resourceId: id,
    metadata: { slug, softDelete },
    ip,
    tenantId: DEFAULT_TENANT_ID,
  });

  return { success: true };
}

export async function bulkSystemRecordsAction(
  session: AuthSession | null,
  slug: string,
  body: unknown,
  ip?: string,
) {
  requirePermission(session, 'system_records:delete');
  requireRecordPermission(session, slug, 'delete');
  const input = bulkSystemRecordActionSchema.parse(body);
  await connect();
  await getDefinitionOrThrow(repository, slug);

  const def = await repository.getDefinition(DEFAULT_TENANT_ID, slug);
  const softDelete = def?.behaviors?.soft_delete !== false;

  let update: Record<string, unknown> = {};
  if (input.action === 'delete') {
    update = softDelete
      ? { status: 'archived', deletedAt: new Date() }
      : { deletedAt: new Date() };
  } else if (input.action === 'restore') {
    update = { status: 'active', deletedAt: null };
  } else if (input.action === 'archive') {
    update = { status: 'archived' };
  }

  const modified = await repository.bulkUpdateRecords(
    DEFAULT_TENANT_ID,
    slug,
    input.ids,
    update,
  );

  await logAuditEvent({
    actorId: session!.userId,
    action: `system_record.bulk_${input.action}`,
    resource: 'system_records',
    resourceId: slug,
    metadata: { ids: input.ids, modified },
    ip,
    tenantId: DEFAULT_TENANT_ID,
  });

  return { success: true, modified };
}

import {
  DEFAULT_TENANT_ID,
  entityReferenceSchema,
  paginationSchema,
  parseEntityReferenceKey,
  validateEntryData,
  type EntityReference,
  type MetaFieldDefinition,
} from '@zodyk/core';
import { AuthError } from '@zodyk/auth';
import {
  getMetaObjectRepository,
  getRepository,
  getSystemEntityRepository,
  type EntityDefinitionRecord,
  type EntityRecordDocument,
  type EntityRepository,
  type ListRecordsFilter,
} from '@zodyk/database';
import { Types } from 'mongoose';

export async function getDefinitionOrThrow(
  repository: EntityRepository,
  slug: string,
  tenantId = DEFAULT_TENANT_ID,
): Promise<EntityDefinitionRecord> {
  const def = await repository.getDefinition(tenantId, slug);
  if (!def || def.status !== 'active') {
    throw new AuthError('Entity definition not found', 404);
  }
  if (def.enabled === false) {
    throw new AuthError('Entity is disabled', 400);
  }
  return def;
}

export async function validateEntityReferences(
  fields: MetaFieldDefinition[],
  data: Record<string, unknown>,
  tenantId = DEFAULT_TENANT_ID,
): Promise<void> {
  const metaRepo = getMetaObjectRepository();
  const systemRepo = getSystemEntityRepository();

  for (const field of fields) {
    if (field.type === 'relation') {
      await validateRelationField(field, data, metaRepo, tenantId);
    }
    if (field.type === 'entity_reference') {
      await validateEntityReferenceField(field, data, metaRepo, systemRepo, tenantId);
    }
  }
}

async function validateRelationField(
  field: MetaFieldDefinition,
  data: Record<string, unknown>,
  metaRepo: EntityRepository,
  tenantId: string,
): Promise<void> {
  const targetSlug = field.settings?.relation?.targetSlug;
  if (!targetSlug) return;

  const value = getFieldValue(data, field.key);
  const ids = Array.isArray(value) ? value : value ? [value] : [];

  for (const id of ids) {
    if (typeof id !== 'string' || !Types.ObjectId.isValid(id)) {
      throw new AuthError(`Invalid relation ID for field ${field.key}`, 400);
    }
    const entry = await metaRepo.getRecord(tenantId, targetSlug, id);
    if (!entry) {
      throw new AuthError(`Related entry not found for field ${field.key}`, 400);
    }
  }
}

async function validateEntityReferenceField(
  field: MetaFieldDefinition,
  data: Record<string, unknown>,
  metaRepo: EntityRepository,
  systemRepo: EntityRepository,
  tenantId: string,
): Promise<void> {
  const value = getFieldValue(data, field.key);
  const refs: EntityReference[] = [];

  if (Array.isArray(value)) {
    for (const item of value) {
      const parsed = entityReferenceSchema.safeParse(item);
      if (parsed.success) refs.push(parsed.data);
    }
  } else if (value) {
    const parsed = entityReferenceSchema.safeParse(value);
    if (parsed.success) refs.push(parsed.data);
  }

  for (const ref of refs) {
    const parsedKey = parseEntityReferenceKey(ref.entityType);
    if (!parsedKey) {
      throw new AuthError(`Invalid entity type for field ${field.key}`, 400);
    }

    const configuredTarget = field.settings?.entityReference?.targetSlug;
    let targetSlug = parsedKey.slug;
    let targetCategory = field.settings?.entityReference?.targetCategory ?? parsedKey.category;

    if (configuredTarget) {
      const configuredParsed = parseEntityReferenceKey(configuredTarget);
      if (configuredParsed) {
        targetSlug = configuredParsed.slug;
        targetCategory = configuredParsed.category;
      } else {
        targetSlug = configuredTarget;
      }
    }

    const repo = getRepository(targetCategory);

    const def = await repo.getDefinition(tenantId, targetSlug);
    if (!def) {
      throw new AuthError(`Referenced entity definition not found for field ${field.key}`, 400);
    }

    if (!Types.ObjectId.isValid(ref.entityId)) {
      throw new AuthError(`Invalid entity ID for field ${field.key}`, 400);
    }

    const record = await repo.getRecord(tenantId, targetSlug, ref.entityId);
    if (!record) {
      throw new AuthError(`Referenced record not found for field ${field.key}`, 400);
    }
  }
}

export async function validateUniqueFields(
  repository: EntityRepository,
  fields: MetaFieldDefinition[],
  data: Record<string, unknown>,
  slug: string,
  tenantId: string,
  excludeId?: string,
): Promise<void> {
  const uniqueFields = fields.filter((f) => f.unique && !f.hidden);

  for (const field of uniqueFields) {
    const value = getFieldValue(data, field.key);
    if (value === undefined || value === null || value === '') continue;

    const filter: ListRecordsFilter = {
      tenantId,
      slug,
      page: 1,
      limit: 2,
      filters: { [field.key]: value },
    };

    const { items } = await repository.listRecords(filter);
    const conflict = items.find((item) => item._id?.toString() !== excludeId);
    if (conflict) {
      throw new AuthError(`Value for ${field.label} must be unique`, 409);
    }
  }
}

export function parseListParams(params: Record<string, string | string[] | undefined>) {
  const { page, limit, search } = paginationSchema.parse({
    page: params.page,
    limit: params.limit,
    search: params.search,
  });

  const status = typeof params.status === 'string' ? params.status : undefined;
  const sort = typeof params.sort === 'string' ? params.sort : undefined;

  const filters: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(params)) {
    if (['page', 'limit', 'search', 'status', 'sort'].includes(key)) continue;
    if (typeof value === 'string' && value.length > 0) {
      filters[key] = value;
    }
  }

  return { page, limit, search, status, sort, filters };
}

export function toRecordDto(item: EntityRecordDocument, slug: string) {
  return {
    id: item._id?.toString() ?? '',
    entitySlug: item.entitySlug ?? item.metaObjectSlug ?? slug,
    handle: item.handle,
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

export function toSystemEntityDefinitionDto(item: EntityDefinitionRecord) {
  return {
    id: item._id?.toString() ?? '',
    name: item.name,
    slug: item.slug,
    icon: item.icon,
    description: item.description,
    color: item.color,
    singularLabel: item.singularLabel ?? item.singularName ?? item.name,
    pluralLabel: item.pluralLabel ?? `${item.name}s`,
    enabled: item.enabled ?? true,
    systemCategory: item.systemCategory,
    defaultView: item.defaultView ?? 'table',
    behaviors: item.behaviors ?? {},
    fieldGroups: item.fieldGroups,
    fields: item.fields,
    relationships: item.relationships ?? [],
    display: item.display ?? {
      tableColumns: [],
      defaultSort: '-createdAt',
      pageSize: 20,
    },
    status: item.status,
    isSystem: item.isSystem,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

export async function validateRecordData(
  fields: MetaFieldDefinition[],
  data: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const validation = validateEntryData(fields, data);
  if (!validation.success) {
    throw new AuthError('Validation failed: ' + validation.error.message, 400);
  }
  return validation.data;
}

function getFieldValue(data: Record<string, unknown>, key: string): unknown {
  if (!key.includes('.')) return data[key];
  return key.split('.').reduce<unknown>((acc, part) => {
    if (acc && typeof acc === 'object' && part in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[part];
    }
    return undefined;
  }, data);
}

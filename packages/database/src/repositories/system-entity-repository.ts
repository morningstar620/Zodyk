import type { MetaFieldDefinition } from '@zodyk/core';
import { getModels } from '../get-models';
import type {
  EntityDefinitionRecord,
  EntityRecordDocument,
  EntityRepository,
  ListRecordsFilter,
  ListRecordsResult,
} from './entity-repository';

function toDefinitionRecord(doc: Record<string, unknown>): EntityDefinitionRecord {
  return doc as unknown as EntityDefinitionRecord;
}

function toRecordDocument(doc: Record<string, unknown>): EntityRecordDocument {
  return doc as unknown as EntityRecordDocument;
}

function parseSort(sort: string): Record<string, 1 | -1> {
  const desc = sort.startsWith('-');
  const field = desc ? sort.slice(1) : sort;
  const mongoField =
    field.startsWith('data.') || ['createdAt', 'updatedAt', 'status'].includes(field)
      ? field
      : `data.${field}`;
  return { [mongoField]: desc ? -1 : 1 };
}

function buildSearchQuery(search: string, fields: MetaFieldDefinition[]): Record<string, unknown> {
  const searchableFields = fields.filter((f) => f.searchable && !f.hidden);
  if (searchableFields.length > 0) {
    const orConditions = searchableFields.map((field) => ({
      [`data.${field.key}`]: { $regex: search, $options: 'i' },
    }));
    return { $or: orConditions };
  }

  return {
    $or: [
      { 'data.name': { $regex: search, $options: 'i' } },
      { 'data.title': { $regex: search, $options: 'i' } },
      { 'data.label': { $regex: search, $options: 'i' } },
    ],
  };
}

function applyFieldFilters(
  filters: Record<string, unknown> | undefined,
  fields: MetaFieldDefinition[],
): Record<string, unknown> {
  if (!filters || Object.keys(filters).length === 0) return {};

  const filterableKeys = new Set(
    fields.filter((f) => f.filterable && !f.hidden).map((f) => f.key),
  );

  const mongoFilters: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(filters)) {
    if (!filterableKeys.has(key) || value === undefined || value === '') continue;
    mongoFilters[`data.${key}`] = value;
  }
  return mongoFilters;
}

export class SystemEntityRepository implements EntityRepository {
  readonly category = 'system' as const;
  private definitionFieldsCache = new Map<string, MetaFieldDefinition[]>();

  async listDefinitions(tenantId: string): Promise<EntityDefinitionRecord[]> {
    const { SystemEntityDefinition } = getModels();
    const items = await SystemEntityDefinition.find({ tenantId }).sort({ name: 1 }).lean();
    return items.map((item: Record<string, unknown>) => toDefinitionRecord(item));
  }

  async getDefinition(tenantId: string, slug: string): Promise<EntityDefinitionRecord | null> {
    const { SystemEntityDefinition } = getModels();
    const item = await SystemEntityDefinition.findOne({ slug: slug.toLowerCase(), tenantId }).lean();
    if (item) {
      this.definitionFieldsCache.set(slug.toLowerCase(), item.fields as MetaFieldDefinition[]);
    }
    return item ? toDefinitionRecord(item as Record<string, unknown>) : null;
  }

  async createDefinition(
    tenantId: string,
    data: Record<string, unknown>,
  ): Promise<EntityDefinitionRecord> {
    const { SystemEntityDefinition } = getModels();
    const item = await SystemEntityDefinition.create({ ...data, tenantId });
    return toDefinitionRecord(item.toObject() as unknown as Record<string, unknown>);
  }

  async updateDefinition(
    tenantId: string,
    slug: string,
    data: Record<string, unknown>,
  ): Promise<EntityDefinitionRecord | null> {
    const { SystemEntityDefinition } = getModels();
    const item = await SystemEntityDefinition.findOneAndUpdate(
      { slug: slug.toLowerCase(), tenantId },
      { $set: data },
      { new: true },
    ).lean();
    if (item) {
      this.definitionFieldsCache.set(slug.toLowerCase(), item.fields as MetaFieldDefinition[]);
    }
    return item ? toDefinitionRecord(item as Record<string, unknown>) : null;
  }

  async deleteDefinition(tenantId: string, slug: string): Promise<boolean> {
    const { SystemEntityDefinition } = getModels();
    const result = await SystemEntityDefinition.deleteOne({ slug: slug.toLowerCase(), tenantId });
    this.definitionFieldsCache.delete(slug.toLowerCase());
    return result.deletedCount > 0;
  }

  async listRecords(filter: ListRecordsFilter): Promise<ListRecordsResult> {
    const { SystemEntityRecord } = getModels();
    const def = await this.getDefinition(filter.tenantId, filter.slug);
    const fields = (def?.fields ?? []) as MetaFieldDefinition[];

    const query: Record<string, unknown> = {
      tenantId: filter.tenantId,
      entitySlug: filter.slug.toLowerCase(),
      deletedAt: { $exists: false },
      ...applyFieldFilters(filter.filters, fields),
    };
    if (filter.status) query.status = filter.status;

    if (filter.search) {
      const searchQuery = buildSearchQuery(filter.search, fields);
      Object.assign(query, searchQuery);
    }

    const sort = parseSort(filter.sort ?? '-createdAt');
    const skip = (filter.page - 1) * filter.limit;

    const [items, total] = await Promise.all([
      SystemEntityRecord.find(query).sort(sort).skip(skip).limit(filter.limit).lean(),
      SystemEntityRecord.countDocuments(query),
    ]);

    return {
      items: items.map((item: Record<string, unknown>) => toRecordDocument(item)),
      total,
    };
  }

  async getRecord(
    tenantId: string,
    slug: string,
    id: string,
  ): Promise<EntityRecordDocument | null> {
    const { SystemEntityRecord } = getModels();
    const item = await SystemEntityRecord.findOne({
      _id: id,
      entitySlug: slug.toLowerCase(),
      tenantId,
      deletedAt: { $exists: false },
    }).lean();
    return item ? toRecordDocument(item as Record<string, unknown>) : null;
  }

  async createRecord(
    tenantId: string,
    slug: string,
    data: Record<string, unknown>,
  ): Promise<EntityRecordDocument> {
    const { SystemEntityRecord } = getModels();
    const item = await SystemEntityRecord.create({
      ...data,
      entitySlug: slug.toLowerCase(),
      tenantId,
    });
    return toRecordDocument(item.toObject() as unknown as Record<string, unknown>);
  }

  async updateRecord(
    tenantId: string,
    slug: string,
    id: string,
    data: Record<string, unknown>,
  ): Promise<EntityRecordDocument | null> {
    const { SystemEntityRecord } = getModels();
    const item = await SystemEntityRecord.findOneAndUpdate(
      {
        _id: id,
        entitySlug: slug.toLowerCase(),
        tenantId,
        deletedAt: { $exists: false },
      },
      { $set: data },
      { new: true },
    ).lean();
    return item ? toRecordDocument(item as Record<string, unknown>) : null;
  }

  async deleteRecord(
    tenantId: string,
    slug: string,
    id: string,
    soft = true,
  ): Promise<boolean> {
    const { SystemEntityRecord } = getModels();
    if (soft) {
      const item = await SystemEntityRecord.findOneAndUpdate(
        {
          _id: id,
          entitySlug: slug.toLowerCase(),
          tenantId,
          deletedAt: { $exists: false },
        },
        { status: 'archived', deletedAt: new Date() },
      );
      return !!item;
    }
    const result = await SystemEntityRecord.deleteOne({
      _id: id,
      entitySlug: slug.toLowerCase(),
      tenantId,
    });
    return result.deletedCount > 0;
  }

  async countRecords(tenantId: string, slug: string, includeDeleted = false): Promise<number> {
    const { SystemEntityRecord } = getModels();
    const filter: Record<string, unknown> = {
      tenantId,
      entitySlug: slug.toLowerCase(),
    };
    if (!includeDeleted) filter.deletedAt = { $exists: false };
    return SystemEntityRecord.countDocuments(filter);
  }

  async bulkUpdateRecords(
    tenantId: string,
    slug: string,
    ids: string[],
    update: Record<string, unknown>,
  ): Promise<number> {
    const { SystemEntityRecord } = getModels();
    const result = await SystemEntityRecord.updateMany(
      {
        _id: { $in: ids },
        entitySlug: slug.toLowerCase(),
        tenantId,
      },
      { $set: update },
    );
    return result.modifiedCount;
  }

  getRecordModel() {
    return getModels().SystemEntityRecord as unknown as EntityRepository['getRecordModel'] extends () => infer R
      ? R
      : never;
  }
}

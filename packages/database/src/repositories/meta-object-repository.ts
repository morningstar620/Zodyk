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

export class MetaObjectRepository implements EntityRepository {
  readonly category = 'meta_object' as const;

  async listDefinitions(tenantId: string): Promise<EntityDefinitionRecord[]> {
    const { MetaObjectDefinition } = getModels();
    const items = await MetaObjectDefinition.find({ tenantId }).sort({ name: 1 }).lean();
    return items.map((item: Record<string, unknown>) => toDefinitionRecord(item));
  }

  async getDefinition(tenantId: string, slug: string): Promise<EntityDefinitionRecord | null> {
    const { MetaObjectDefinition } = getModels();
    const item = await MetaObjectDefinition.findOne({ slug: slug.toLowerCase(), tenantId }).lean();
    return item ? toDefinitionRecord(item as Record<string, unknown>) : null;
  }

  async createDefinition(
    tenantId: string,
    data: Record<string, unknown>,
  ): Promise<EntityDefinitionRecord> {
    const { MetaObjectDefinition } = getModels();
    const item = await MetaObjectDefinition.create({ ...data, tenantId });
    return toDefinitionRecord(item.toObject() as unknown as Record<string, unknown>);
  }

  async updateDefinition(
    tenantId: string,
    slug: string,
    data: Record<string, unknown>,
  ): Promise<EntityDefinitionRecord | null> {
    const { MetaObjectDefinition } = getModels();
    const item = await MetaObjectDefinition.findOneAndUpdate(
      { slug: slug.toLowerCase(), tenantId },
      { $set: data },
      { new: true },
    ).lean();
    return item ? toDefinitionRecord(item as Record<string, unknown>) : null;
  }

  async deleteDefinition(tenantId: string, slug: string): Promise<boolean> {
    const { MetaObjectDefinition } = getModels();
    const result = await MetaObjectDefinition.deleteOne({ slug: slug.toLowerCase(), tenantId });
    return result.deletedCount > 0;
  }

  async listRecords(filter: ListRecordsFilter): Promise<ListRecordsResult> {
    const { MetaObjectEntry } = getModels();
    const query: Record<string, unknown> = {
      tenantId: filter.tenantId,
      metaObjectSlug: filter.slug.toLowerCase(),
      deletedAt: { $exists: false },
    };
    if (filter.status) query.status = filter.status;

    const sort = parseSort(filter.sort ?? '-createdAt');
    const skip = (filter.page - 1) * filter.limit;

    let items = await MetaObjectEntry.find(query).sort(sort).skip(skip).limit(filter.limit).lean();

    if (filter.search) {
      const q = filter.search.toLowerCase();
      items = items.filter((item: { data: Record<string, unknown> }) =>
        JSON.stringify(item.data).toLowerCase().includes(q),
      );
    }

    const total = await MetaObjectEntry.countDocuments(query);
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
    const { MetaObjectEntry } = getModels();
    const item = await MetaObjectEntry.findOne({
      _id: id,
      metaObjectSlug: slug.toLowerCase(),
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
    const { MetaObjectEntry } = getModels();
    const item = await MetaObjectEntry.create({
      ...data,
      metaObjectSlug: slug.toLowerCase(),
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
    const { MetaObjectEntry } = getModels();
    const item = await MetaObjectEntry.findOneAndUpdate(
      {
        _id: id,
        metaObjectSlug: slug.toLowerCase(),
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
    const { MetaObjectEntry } = getModels();
    if (soft) {
      const item = await MetaObjectEntry.findOneAndUpdate(
        {
          _id: id,
          metaObjectSlug: slug.toLowerCase(),
          tenantId,
          deletedAt: { $exists: false },
        },
        { status: 'archived', deletedAt: new Date() },
      );
      return !!item;
    }
    const result = await MetaObjectEntry.deleteOne({
      _id: id,
      metaObjectSlug: slug.toLowerCase(),
      tenantId,
    });
    return result.deletedCount > 0;
  }

  async countRecords(tenantId: string, slug: string, includeDeleted = false): Promise<number> {
    const { MetaObjectEntry } = getModels();
    const filter: Record<string, unknown> = {
      tenantId,
      metaObjectSlug: slug.toLowerCase(),
    };
    if (!includeDeleted) filter.deletedAt = { $exists: false };
    return MetaObjectEntry.countDocuments(filter);
  }

  async bulkUpdateRecords(
    tenantId: string,
    slug: string,
    ids: string[],
    update: Record<string, unknown>,
  ): Promise<number> {
    const { MetaObjectEntry } = getModels();
    const result = await MetaObjectEntry.updateMany(
      {
        _id: { $in: ids },
        metaObjectSlug: slug.toLowerCase(),
        tenantId,
      },
      { $set: update },
    );
    return result.modifiedCount;
  }

  getRecordModel() {
    return getModels().MetaObjectEntry as unknown as EntityRepository['getRecordModel'] extends () => infer R
      ? R
      : never;
  }
}

function parseSort(sort: string): Record<string, 1 | -1> {
  const desc = sort.startsWith('-');
  const field = desc ? sort.slice(1) : sort;
  const mongoField = field.startsWith('data.') ? field : field === 'createdAt' || field === 'updatedAt' || field === 'status' ? field : `data.${field}`;
  return { [mongoField]: desc ? -1 : 1 };
}

export function getSearchableFields(fields: MetaFieldDefinition[]): MetaFieldDefinition[] {
  return fields.filter((f) => f.searchable && !f.hidden);
}

export function getFilterableFields(fields: MetaFieldDefinition[]): MetaFieldDefinition[] {
  return fields.filter((f) => f.filterable && !f.hidden);
}

export function getSortableFields(fields: MetaFieldDefinition[]): MetaFieldDefinition[] {
  return fields.filter((f) => f.sortable && !f.hidden);
}

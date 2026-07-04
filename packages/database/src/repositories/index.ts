import type { EntityCategory, MetaFieldDefinition } from '@zodyk/core';
import type { Model } from 'mongoose';
import type { EntityRepository } from './entity-repository';
import { MetaObjectRepository } from './meta-object-repository';
import { SystemEntityRepository } from './system-entity-repository';

const repositories: Record<EntityCategory, EntityRepository> = {
  meta_object: new MetaObjectRepository(),
  system: new SystemEntityRepository(),
};

export function getRepository(category: EntityCategory): EntityRepository {
  return repositories[category];
}

export function getMetaObjectRepository(): MetaObjectRepository {
  return repositories.meta_object as MetaObjectRepository;
}

export function getSystemEntityRepository(): SystemEntityRepository {
  return repositories.system as SystemEntityRepository;
}

export async function ensureEntityIndexes(
  recordModel: Model<Record<string, unknown>>,
  tenantId: string,
  entitySlug: string,
  fields: MetaFieldDefinition[],
): Promise<void> {
  const indexSpecs: Array<{ key: Record<string, 1 | -1>; options?: { unique?: boolean; sparse?: boolean; name?: string } }> = [];

  for (const field of fields) {
    if (field.hidden) continue;

    const indexKey = `data.${field.key}`;
    const indexName = `tenant_${entitySlug}_${field.key.replace(/\./g, '_')}`;

    if (field.unique) {
      indexSpecs.push({
        key: { tenantId: 1, entitySlug: 1, [indexKey]: 1 },
        options: { unique: true, sparse: true, name: `${indexName}_unique` },
      });
    }

    if (field.filterable || field.sortable) {
      indexSpecs.push({
        key: { tenantId: 1, entitySlug: 1, [indexKey]: 1 },
        options: { sparse: true, name: `${indexName}_query` },
      });
    }
  }

  const searchableFields = fields.filter((f) => f.searchable && !f.hidden);
  if (searchableFields.length > 0) {
    const textIndex: Record<string, 'text'> = {};
    for (const field of searchableFields) {
      textIndex[`data.${field.key}`] = 'text';
    }
    indexSpecs.push({
      key: textIndex as unknown as Record<string, 1 | -1>,
      options: { name: `tenant_${entitySlug}_search_text` },
    });
  }

  for (const spec of indexSpecs) {
    try {
      await recordModel.collection.createIndex(spec.key, spec.options ?? {});
    } catch {
      // Index may already exist with different options; skip conflicts
    }
  }
}

export * from './entity-repository';
export * from './meta-object-repository';
export * from './system-entity-repository';

import type { MetaFieldDefinition } from '@zodyk/core';
import type { Model } from 'mongoose';

export interface EntityDefinitionRecord {
  _id: unknown;
  name: string;
  slug: string;
  singularName?: string;
  singularLabel?: string;
  pluralLabel?: string;
  description?: string;
  icon?: string;
  color?: string;
  enabled?: boolean;
  systemCategory?: string;
  defaultView?: string;
  behaviors?: Record<string, boolean>;
  fieldGroups: unknown[];
  fields: MetaFieldDefinition[];
  relationships?: unknown[];
  display?: unknown;
  status: string;
  isSystem: boolean;
  routing?: unknown;
  templates?: unknown;
  tenantId: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface EntityRecordDocument {
  _id: unknown;
  entitySlug?: string;
  metaObjectSlug?: string;
  handle?: string;
  status: string;
  locale?: string;
  data: Record<string, unknown>;
  translations?: Record<string, Record<string, unknown>>;
  publishedAt?: Date;
  scheduledAt?: Date;
  createdBy?: unknown;
  updatedBy?: unknown;
  tenantId: string;
  deletedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ListRecordsFilter {
  tenantId: string;
  slug: string;
  status?: string;
  search?: string;
  filters?: Record<string, unknown>;
  sort?: string;
  page: number;
  limit: number;
}

export interface ListRecordsResult {
  items: EntityRecordDocument[];
  total: number;
}

export interface EntityRepository {
  readonly category: 'meta_object' | 'system';

  listDefinitions(tenantId: string): Promise<EntityDefinitionRecord[]>;
  getDefinition(tenantId: string, slug: string): Promise<EntityDefinitionRecord | null>;
  createDefinition(tenantId: string, data: Record<string, unknown>): Promise<EntityDefinitionRecord>;
  updateDefinition(
    tenantId: string,
    slug: string,
    data: Record<string, unknown>,
  ): Promise<EntityDefinitionRecord | null>;
  deleteDefinition(tenantId: string, slug: string): Promise<boolean>;

  listRecords(filter: ListRecordsFilter): Promise<ListRecordsResult>;
  getRecord(tenantId: string, slug: string, id: string): Promise<EntityRecordDocument | null>;
  createRecord(
    tenantId: string,
    slug: string,
    data: Record<string, unknown>,
  ): Promise<EntityRecordDocument>;
  updateRecord(
    tenantId: string,
    slug: string,
    id: string,
    data: Record<string, unknown>,
  ): Promise<EntityRecordDocument | null>;
  deleteRecord(tenantId: string, slug: string, id: string, soft?: boolean): Promise<boolean>;
  countRecords(tenantId: string, slug: string, includeDeleted?: boolean): Promise<number>;
  bulkUpdateRecords(
    tenantId: string,
    slug: string,
    ids: string[],
    update: Record<string, unknown>,
  ): Promise<number>;

  getRecordModel(): Model<EntityRecordDocument>;
}

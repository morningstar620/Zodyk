import { DEFAULT_TENANT_ID } from '@zodyk/core';
import { Schema, type Document, type Model } from 'mongoose';
import type { MetaFieldDefinition, MetaFieldGroup } from '@zodyk/core';

export type MetaObjectStatus = 'active' | 'archived';

export interface MetaObjectRouting {
  archiveEnabled: boolean;
  archivePath?: string;
  singlePath?: string;
  handleField: string;
}

export interface MetaObjectTemplates {
  templateKey?: string;
  archiveTemplateKey?: string;
  singleTemplateKey?: string;
}

export interface MetaObjectDisplay {
  archiveFields: string[];
  archiveSort: string;
  archivePageSize: number;
}

export interface IMetaObjectDefinition extends Document {
  name: string;
  slug: string;
  singularName?: string;
  description?: string;
  fieldGroups: MetaFieldGroup[];
  fields: MetaFieldDefinition[];
  status: MetaObjectStatus;
  isSystem: boolean;
  routing: MetaObjectRouting;
  templates: MetaObjectTemplates;
  display: MetaObjectDisplay;
  tenantId: string;
  createdAt: Date;
  updatedAt: Date;
}

const metaFieldGroupSchema = new Schema(
  {
    key: { type: String, required: true },
    label: { type: String, required: true },
    isSystem: { type: Boolean, default: false },
    order: { type: Number, default: 0 },
  },
  { _id: false },
);

const metaObjectDefinitionSchema = new Schema<IMetaObjectDefinition>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true, lowercase: true },
    singularName: { type: String, trim: true },
    description: { type: String, trim: true },
    fieldGroups: [metaFieldGroupSchema],
    fields: { type: Schema.Types.Mixed, default: [] },
    status: { type: String, enum: ['active', 'archived'], default: 'active' },
    isSystem: { type: Boolean, default: false },
    routing: {
      archiveEnabled: { type: Boolean, default: true },
      archivePath: { type: String, trim: true },
      singlePath: { type: String, trim: true },
      handleField: { type: String, default: 'handle' },
    },
    templates: {
      templateKey: { type: String, trim: true },
      archiveTemplateKey: { type: String, trim: true },
      singleTemplateKey: { type: String, trim: true },
    },
    display: {
      archiveFields: { type: [String], default: [] },
      archiveSort: { type: String, default: '-createdAt' },
      archivePageSize: { type: Number, default: 12 },
    },
    tenantId: { type: String, required: true, default: DEFAULT_TENANT_ID },
  },
  { timestamps: true },
);

metaObjectDefinitionSchema.index({ tenantId: 1, slug: 1 }, { unique: true });
metaObjectDefinitionSchema.index({ tenantId: 1, status: 1 });

export type MetaObjectDefinitionModel = Model<IMetaObjectDefinition>;

export function getMetaObjectDefinitionModel(
  mongoose: typeof import('mongoose'),
): MetaObjectDefinitionModel {
  return (
    (mongoose.models.MetaObjectDefinition as MetaObjectDefinitionModel) ??
    mongoose.model<IMetaObjectDefinition>('MetaObjectDefinition', metaObjectDefinitionSchema)
  );
}

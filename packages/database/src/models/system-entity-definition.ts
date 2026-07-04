import { DEFAULT_TENANT_ID } from '@zodyk/core';
import { Schema, type Document, type Model } from 'mongoose';
import type {
  EntityRelationship,
  MetaFieldDefinition,
  MetaFieldGroup,
  SystemEntityDisplay,
} from '@zodyk/core';

export type SystemEntityStatus = 'active' | 'archived';

export interface ISystemEntityDefinition extends Document {
  name: string;
  slug: string;
  icon?: string;
  description?: string;
  color?: string;
  singularLabel: string;
  pluralLabel: string;
  enabled: boolean;
  systemCategory?: string;
  defaultView: 'table' | 'list' | 'card';
  behaviors: Record<string, boolean>;
  fieldGroups: MetaFieldGroup[];
  fields: MetaFieldDefinition[];
  relationships: EntityRelationship[];
  display: SystemEntityDisplay;
  status: SystemEntityStatus;
  isSystem: boolean;
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

const systemEntityDefinitionSchema = new Schema<ISystemEntityDefinition>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true, lowercase: true },
    icon: { type: String, trim: true },
    description: { type: String, trim: true },
    color: { type: String, trim: true },
    singularLabel: { type: String, required: true, trim: true },
    pluralLabel: { type: String, required: true, trim: true },
    enabled: { type: Boolean, default: true },
    systemCategory: { type: String, trim: true },
    defaultView: { type: String, enum: ['table', 'list', 'card'], default: 'table' },
    behaviors: { type: Schema.Types.Mixed, default: {} },
    fieldGroups: [metaFieldGroupSchema],
    fields: { type: Schema.Types.Mixed, default: [] },
    relationships: { type: Schema.Types.Mixed, default: [] },
    display: {
      tableColumns: { type: [String], default: [] },
      defaultSort: { type: String, default: '-createdAt' },
      pageSize: { type: Number, default: 20 },
    },
    status: { type: String, enum: ['active', 'archived'], default: 'active' },
    isSystem: { type: Boolean, default: false },
    tenantId: { type: String, required: true, default: DEFAULT_TENANT_ID },
  },
  { timestamps: true },
);

systemEntityDefinitionSchema.index({ tenantId: 1, slug: 1 }, { unique: true });
systemEntityDefinitionSchema.index({ tenantId: 1, status: 1 });
systemEntityDefinitionSchema.index({ tenantId: 1, enabled: 1 });

export type SystemEntityDefinitionModel = Model<ISystemEntityDefinition>;

export function getSystemEntityDefinitionModel(
  mongoose: typeof import('mongoose'),
): SystemEntityDefinitionModel {
  return (
    (mongoose.models.SystemEntityDefinition as SystemEntityDefinitionModel) ??
    mongoose.model<ISystemEntityDefinition>('SystemEntityDefinition', systemEntityDefinitionSchema)
  );
}

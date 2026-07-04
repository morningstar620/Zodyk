import { z } from 'zod';
import { metaFieldDefinitionSchema, metaFieldGroupSchema } from '../meta/field-definition';
import { behaviorsSchema, mergeBehaviors } from './behaviors';
import { entityRelationshipsSchema } from './relationships';
import { mergeWithDefaultSystemFields } from './default-system-fields';

export const systemEntityViewSchema = z.enum(['table', 'list', 'card']);

export const systemEntityStatusSchema = z.enum(['active', 'archived']);

export const systemEntityDisplaySchema = z.object({
  tableColumns: z.array(z.string()).default([]),
  defaultSort: z.string().default('-createdAt'),
  pageSize: z.number().int().min(1).max(100).default(20),
});

export const createSystemEntitySchema = z
  .object({
    name: z.string().min(1).max(100),
    slug: z
      .string()
      .min(1)
      .max(50)
      .regex(/^[a-z][a-z0-9_]*$/, 'Slug must be lowercase alphanumeric with underscores'),
    icon: z.string().max(50).optional(),
    description: z.string().max(500).optional(),
    color: z.string().max(20).optional(),
    singularLabel: z.string().min(1).max(100).optional(),
    pluralLabel: z.string().min(1).max(100).optional(),
    enabled: z.boolean().default(true),
    systemCategory: z.string().max(50).optional(),
    defaultView: systemEntityViewSchema.default('table'),
    behaviors: behaviorsSchema.optional(),
    fieldGroups: z.array(metaFieldGroupSchema).default([]),
    fields: z.array(metaFieldDefinitionSchema).default([]),
    relationships: entityRelationshipsSchema.optional(),
    display: systemEntityDisplaySchema.optional(),
    status: systemEntityStatusSchema.default('active'),
  })
  .transform((data) => {
    const merged = mergeWithDefaultSystemFields(data.fieldGroups, data.fields);
    return {
      ...data,
      ...merged,
      behaviors: mergeBehaviors(data.behaviors),
      singularLabel: data.singularLabel ?? data.name,
      pluralLabel: data.pluralLabel ?? `${data.name}s`,
      relationships: data.relationships ?? [],
      display: data.display ?? {
        tableColumns: [],
        defaultSort: '-createdAt',
        pageSize: 20,
      },
    };
  });

export const updateSystemEntitySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  icon: z.string().max(50).nullable().optional(),
  description: z.string().max(500).nullable().optional(),
  color: z.string().max(20).nullable().optional(),
  singularLabel: z.string().min(1).max(100).optional(),
  pluralLabel: z.string().min(1).max(100).optional(),
  enabled: z.boolean().optional(),
  systemCategory: z.string().max(50).nullable().optional(),
  defaultView: systemEntityViewSchema.optional(),
  behaviors: behaviorsSchema.optional(),
  fieldGroups: z.array(metaFieldGroupSchema).optional(),
  fields: z.array(metaFieldDefinitionSchema).optional(),
  relationships: entityRelationshipsSchema.optional(),
  display: systemEntityDisplaySchema.optional(),
  status: systemEntityStatusSchema.optional(),
});

export type CreateSystemEntityInput = z.infer<typeof createSystemEntitySchema>;
export type UpdateSystemEntityInput = z.infer<typeof updateSystemEntitySchema>;
export type SystemEntityView = z.infer<typeof systemEntityViewSchema>;
export type SystemEntityDisplay = z.infer<typeof systemEntityDisplaySchema>;

export interface SystemEntityDefinitionPayload {
  id: string;
  name: string;
  slug: string;
  icon?: string;
  description?: string;
  color?: string;
  singularLabel: string;
  pluralLabel: string;
  enabled: boolean;
  systemCategory?: string;
  defaultView: SystemEntityView;
  behaviors: Record<string, boolean>;
  fieldGroups: z.infer<typeof metaFieldGroupSchema>[];
  fields: z.infer<typeof metaFieldDefinitionSchema>[];
  relationships: z.infer<typeof entityRelationshipsSchema>;
  display: SystemEntityDisplay;
  status: z.infer<typeof systemEntityStatusSchema>;
  isSystem: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

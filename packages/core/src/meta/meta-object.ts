import { z } from 'zod';
import { metaFieldDefinitionSchema, metaFieldGroupSchema } from './field-definition';
import { mergeWithDefaultSeo } from './default-seo-group';

export const metaObjectStatusSchema = z.enum(['active', 'archived']);

export const metaObjectRoutingSchema = z.object({
  archiveEnabled: z.boolean().default(true),
  archivePath: z.string().min(1).max(200).optional(),
  singlePath: z.string().min(1).max(200).optional(),
  handleField: z.string().min(1).max(50).default('handle'),
});

export const metaObjectTemplatesSchema = z.object({
  templateKey: z.string().min(1).max(50).optional(),
  archiveTemplateKey: z.string().min(1).max(50).optional(),
  singleTemplateKey: z.string().min(1).max(50).optional(),
});

export const metaObjectDisplaySchema = z.object({
  archiveFields: z.array(z.string()).default([]),
  archiveSort: z.string().default('-createdAt'),
  archivePageSize: z.number().int().min(1).max(100).default(12),
});

export const createMetaObjectSchema = z
  .object({
    name: z.string().min(1).max(100),
    slug: z
      .string()
      .min(1)
      .max(50)
      .regex(/^[a-z][a-z0-9_]*$/, 'Slug must be lowercase alphanumeric with underscores'),
    singularName: z.string().min(1).max(100).optional(),
    description: z.string().max(500).optional(),
    fieldGroups: z.array(metaFieldGroupSchema).default([]),
    fields: z.array(metaFieldDefinitionSchema).default([]),
    status: metaObjectStatusSchema.default('active'),
    routing: metaObjectRoutingSchema.optional(),
    templates: metaObjectTemplatesSchema.optional(),
    display: metaObjectDisplaySchema.optional(),
  })
  .transform((data) => {
    const merged = mergeWithDefaultSeo(data.fieldGroups, data.fields);
    return { ...data, ...merged };
  });

export const updateMetaObjectSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  singularName: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  fieldGroups: z.array(metaFieldGroupSchema).optional(),
  fields: z.array(metaFieldDefinitionSchema).optional(),
  status: metaObjectStatusSchema.optional(),
  routing: metaObjectRoutingSchema.optional(),
  templates: metaObjectTemplatesSchema.optional(),
  display: metaObjectDisplaySchema.optional(),
});

export type CreateMetaObjectInput = z.input<typeof createMetaObjectSchema>;
export type UpdateMetaObjectInput = z.infer<typeof updateMetaObjectSchema>;

export interface MetaObjectDefinitionPayload {
  name: string;
  slug: string;
  singularName?: string;
  description?: string;
  fieldGroups: z.infer<typeof metaFieldGroupSchema>[];
  fields: z.infer<typeof metaFieldDefinitionSchema>[];
  status: z.infer<typeof metaObjectStatusSchema>;
  routing?: z.infer<typeof metaObjectRoutingSchema>;
  templates?: z.infer<typeof metaObjectTemplatesSchema>;
  display?: z.infer<typeof metaObjectDisplaySchema>;
}

export function defaultMetaObjectRouting(slug: string): z.infer<typeof metaObjectRoutingSchema> {
  return {
    archiveEnabled: true,
    archivePath: slug,
    singlePath: `${slug}/:handle`,
    handleField: 'handle',
  };
}

export function defaultMetaObjectTemplates(slug: string): z.infer<typeof metaObjectTemplatesSchema> {
  return { templateKey: slug };
}

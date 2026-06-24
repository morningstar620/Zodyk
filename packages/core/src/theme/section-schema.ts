import { z } from 'zod';
import { dynamicSourceConfigSchema } from './dynamic-source';

export const sectionSettingTypeSchema = z.enum([
  'text',
  'textarea',
  'richtext',
  'image',
  'gallery',
  'color',
  'range',
  'select',
  'checkbox',
  'url',
  'repeater',
  'meta_object_relation',
  'page_relation',
]);

export const sectionSettingSchema = z.object({
  id: z.string().min(1),
  type: sectionSettingTypeSchema,
  label: z.string(),
  default: z.unknown().optional(),
  info: z.string().optional(),
  options: z
    .array(z.object({ value: z.string(), label: z.string() }))
    .optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  step: z.number().optional(),
  dynamic_source: dynamicSourceConfigSchema.optional(),
});

export const sectionBlockSchema = z.object({
  type: z.string().min(1),
  name: z.string(),
  limit: z.number().optional(),
  settings: z.array(sectionSettingSchema).default([]),
});

export const sectionPresetSchema = z.object({
  name: z.string(),
  settings: z.record(z.unknown()).optional(),
  blocks: z
    .array(
      z.object({
        type: z.string(),
        settings: z.record(z.unknown()).optional(),
      }),
    )
    .optional(),
});

export const sectionDefinitionSchema = z.object({
  name: z.string(),
  tag: z.string().default('section'),
  class: z.string().optional(),
  category: z.string().optional(),
  settings: z.array(sectionSettingSchema).default([]),
  blocks: z.array(sectionBlockSchema).default([]),
  presets: z.array(sectionPresetSchema).default([]),
  max_blocks: z.number().optional(),
});

export type SectionSettingType = z.infer<typeof sectionSettingTypeSchema>;
export type SectionSetting = z.infer<typeof sectionSettingSchema>;
export type SectionBlockDefinition = z.infer<typeof sectionBlockSchema>;
export type SectionPreset = z.infer<typeof sectionPresetSchema>;
export type SectionDefinition = z.infer<typeof sectionDefinitionSchema>;

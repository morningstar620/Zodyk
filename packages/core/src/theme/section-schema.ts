import { z } from 'zod';
import { dynamicSourceConfigSchema } from './dynamic-source';

export const sectionSettingTypeSchema = z.enum([
  'header',
  'paragraph',
  'text',
  'textarea',
  'richtext',
  'inline_richtext',
  'image',
  'gallery',
  'color',
  'color_background',
  'range',
  'select',
  'radio',
  'checkbox',
  'url',
  'number',
  'text_alignment',
  'font_picker',
  'video',
  'video_url',
  'file',
  'product',
  'collection',
  'page',
  'article',
  'blog',
  'metaobject',
  'link_list',
  'spacing',
  'typography',
  'repeater',
  'meta_object_relation',
  'page_relation',
]);

export const sectionSettingSchema = z.object({
  id: z.string().min(1).optional(),
  type: sectionSettingTypeSchema,
  label: z.string().optional(),
  content: z.string().optional(),
  default: z.unknown().optional(),
  info: z.string().optional(),
  placeholder: z.string().optional(),
  unit: z.string().optional(),
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
  description: z.string().optional(),
  settings: z.array(sectionSettingSchema).default([]),
  blocks: z.array(sectionBlockSchema).default([]),
  presets: z.array(sectionPresetSchema).default([]),
  max_blocks: z.number().optional(),
  enabled_on: z
    .object({
      groups: z.array(z.string()).optional(),
      templates: z.array(z.string()).optional(),
    })
    .optional(),
});

export type SectionSettingType = z.infer<typeof sectionSettingTypeSchema>;
export type SectionSetting = z.infer<typeof sectionSettingSchema>;
export type SectionBlockDefinition = z.infer<typeof sectionBlockSchema>;
export type SectionPreset = z.infer<typeof sectionPresetSchema>;
export type SectionDefinition = z.infer<typeof sectionDefinitionSchema>;

/** Returns true if the setting type renders an input control */
export function isInputSetting(type: SectionSettingType): boolean {
  return type !== 'header' && type !== 'paragraph';
}

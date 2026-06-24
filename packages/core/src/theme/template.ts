import { z } from 'zod';

export const blockInstanceSchema = z.object({
  type: z.string().min(1),
  settings: z.record(z.unknown()).default({}),
  custom_css: z.string().optional(),
});

export const sectionInstanceSchema = z.object({
  type: z.string().min(1),
  settings: z.record(z.unknown()).default({}),
  blocks: z.record(blockInstanceSchema).optional(),
  block_order: z.array(z.string()).optional(),
  custom_css: z.string().optional(),
});

export const templateJsonSchema = z.object({
  name: z.string().optional(),
  wrapper: z.string().optional(),
  sections: z.record(sectionInstanceSchema).default({}),
  order: z.array(z.string()).default([]),
});

export const sectionOverrideSchema = sectionInstanceSchema.partial().extend({
  settings: z.record(z.unknown()).optional(),
});

export const templateCustomizationSchema = z.object({
  resourceType: z.enum(['page', 'meta_entry']),
  resourceId: z.string().min(1),
  templateKey: z.string().min(1),
  sectionOverrides: z.record(sectionOverrideSchema).default({}),
});

export type BlockInstance = z.infer<typeof blockInstanceSchema>;
export type SectionInstance = z.infer<typeof sectionInstanceSchema>;
export type TemplateJson = z.infer<typeof templateJsonSchema>;
export type SectionOverride = z.infer<typeof sectionOverrideSchema>;
export type TemplateCustomizationPayload = z.infer<typeof templateCustomizationSchema>;

export function mergeTemplateWithOverrides(
  blueprint: TemplateJson,
  overrides: Record<string, SectionOverride> = {},
): TemplateJson {
  const sections: Record<string, SectionInstance> = {};

  for (const [id, instance] of Object.entries(blueprint.sections)) {
    const override = overrides[id];
    if (!override) {
      sections[id] = { ...instance };
      continue;
    }

    sections[id] = {
      ...instance,
      ...override,
      settings: { ...instance.settings, ...override.settings },
      blocks: override.blocks ?? instance.blocks,
      block_order: override.block_order ?? instance.block_order,
    };
  }

  return {
    ...blueprint,
    sections,
    order: blueprint.order.filter((id) => sections[id]),
  };
}

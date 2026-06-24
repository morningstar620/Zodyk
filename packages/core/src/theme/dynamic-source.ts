import { z } from 'zod';

export const dynamicSourceTypeSchema = z.enum(['static', 'page', 'metaobject', 'settings']);

export const dynamicSourceValueSchema = z.discriminatedUnion('source', [
  z.object({ source: z.literal('static'), value: z.unknown() }),
  z.object({ source: z.literal('page'), field: z.string().min(1) }),
  z.object({ source: z.literal('metaobject'), field: z.string().min(1) }),
  z.object({ source: z.literal('settings'), field: z.string().min(1) }),
]);

export const dynamicSourceConfigSchema = z.object({
  enabled: z.boolean().default(true),
  types: z.array(dynamicSourceTypeSchema).default(['static', 'page', 'metaobject', 'settings']),
});

export type DynamicSourceType = z.infer<typeof dynamicSourceTypeSchema>;
export type DynamicSourceValue = z.infer<typeof dynamicSourceValueSchema>;
export type DynamicSourceConfig = z.infer<typeof dynamicSourceConfigSchema>;

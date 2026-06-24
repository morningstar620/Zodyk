import { z } from 'zod';

export const entryStatusSchema = z.enum(['draft', 'published', 'scheduled', 'archived']);

export const createMetaEntrySchema = z.object({
  locale: z.string().min(2).max(10).default('en'),
  status: entryStatusSchema.default('draft'),
  handle: z
    .string()
    .min(1)
    .max(200)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .optional(),
  templateSuffix: z.string().max(50).optional(),
  data: z.record(z.unknown()),
  translations: z.record(z.string(), z.record(z.unknown())).optional(),
  scheduledAt: z.string().datetime().optional(),
});

export const updateMetaEntrySchema = z.object({
  locale: z.string().min(2).max(10).optional(),
  status: entryStatusSchema.optional(),
  handle: z
    .string()
    .min(1)
    .max(200)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .optional(),
  templateSuffix: z.string().max(50).nullable().optional(),
  data: z.record(z.unknown()).optional(),
  translations: z.record(z.string(), z.record(z.unknown())).optional(),
  scheduledAt: z.string().datetime().nullable().optional(),
});

export const publishMetaEntrySchema = z.object({
  scheduledAt: z.string().datetime().optional(),
});

export type CreateMetaEntryInput = z.infer<typeof createMetaEntrySchema>;
export type UpdateMetaEntryInput = z.infer<typeof updateMetaEntrySchema>;
export type PublishMetaEntryInput = z.infer<typeof publishMetaEntrySchema>;
export type EntryStatus = z.infer<typeof entryStatusSchema>;

export function generateEntryHandle(
  data: Record<string, unknown>,
  explicitHandle?: string,
): string {
  if (explicitHandle) return explicitHandle;
  const candidates = ['handle', 'title', 'name'];
  for (const key of candidates) {
    const value = data[key];
    if (typeof value === 'string' && value.trim()) {
      return value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
    }
  }
  return `entry-${Date.now()}`;
}

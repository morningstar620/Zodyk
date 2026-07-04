import { z } from 'zod';

export const pageStatusSchema = z.enum(['draft', 'published', 'scheduled', 'archived']);

export const pageSeoSchema = z.object({
  metaTitle: z.string().max(200).optional(),
  metaDescription: z.string().max(500).optional(),
  ogImage: z.string().optional(),
  canonicalUrl: z.string().url().optional(),
});

export const createPageSchema = z.object({
  title: z.string().min(1).max(200),
  slug: z
    .string()
    .min(1)
    .max(200)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase kebab-case'),
  handle: z
    .string()
    .min(1)
    .max(200)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .optional(),
  parentId: z.string().optional(),
  templateSuffix: z.string().max(50).optional(),
  body: z.string().optional(),
  seo: pageSeoSchema.optional(),
  status: pageStatusSchema.default('draft'),
  scheduledAt: z.string().datetime().optional(),
});

export const updatePageSchema = createPageSchema.partial();

export const publishPageSchema = z.object({
  scheduledAt: z.string().datetime().optional(),
});

export type PageStatus = z.infer<typeof pageStatusSchema>;
export type PageSeo = z.infer<typeof pageSeoSchema>;
export type CreatePageInput = z.infer<typeof createPageSchema>;
export type UpdatePageInput = z.infer<typeof updatePageSchema>;

export function slugToHandle(slug: string): string {
  return slug.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

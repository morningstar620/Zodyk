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
  parentId: z.string().min(1).nullable().optional(),
  templateSuffix: z.string().max(50).nullable().optional(),
  body: z.string().optional(),
  seo: pageSeoSchema.optional(),
  status: pageStatusSchema.default('draft'),
  publishedAt: z.string().datetime().nullable().optional(),
  scheduledAt: z.string().datetime().nullable().optional(),
});

const pageSlugSchema = z
  .string()
  .min(1)
  .max(200)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase kebab-case');

const pageHandleSchema = z
  .string()
  .min(1)
  .max(200)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

/** Partial update. Status is not defaulted, so a title-only patch stays in its current state. */
export const updatePageSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  slug: pageSlugSchema.optional(),
  handle: pageHandleSchema.optional(),
  parentId: z.string().min(1).nullable().optional(),
  templateSuffix: z.string().max(50).nullable().optional(),
  body: z.string().optional(),
  seo: pageSeoSchema.optional(),
  status: pageStatusSchema.optional(),
  publishedAt: z.string().datetime().nullable().optional(),
  scheduledAt: z.string().datetime().nullable().optional(),
});

export const publishPageSchema = z.object({
  publishedAt: z.string().datetime().optional(),
  scheduledAt: z.string().datetime().optional(),
});

export type PageStatus = z.infer<typeof pageStatusSchema>;
export type PageSeo = z.infer<typeof pageSeoSchema>;
export type CreatePageInput = z.infer<typeof createPageSchema>;
export type UpdatePageInput = z.infer<typeof updatePageSchema>;

export function slugToHandle(slug: string): string {
  return slug
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

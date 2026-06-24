import { z } from 'zod';

export const mediaMetadataSchema = z.object({
  alt: z.string().max(500).optional(),
  title: z.string().max(200).optional(),
  caption: z.string().max(1000).optional(),
});

export const updateMediaSchema = z.object({
  metadata: mediaMetadataSchema.optional(),
  folder: z
    .string()
    .regex(/^\/[a-zA-Z0-9/_-]*$/, 'Folder must start with / and use safe characters')
    .optional(),
});

export const bulkDeleteMediaSchema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(100),
});

export const mediaListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(24),
  search: z.string().optional(),
  folder: z.string().default('/'),
  mimeType: z.string().optional(),
});

export const r2SettingsSchema = z.object({
  accountId: z.string().min(1),
  accessKeyId: z.string().min(1),
  secretAccessKey: z.string().min(1).optional(),
  bucket: z.string().min(1),
  publicUrl: z.union([z.string().url(), z.literal('')]).optional(),
  endpoint: z.union([z.string().url(), z.literal('')]).optional(),
  testConnection: z.boolean().optional(),
});

export type MediaMetadataInput = z.infer<typeof mediaMetadataSchema>;
export type UpdateMediaInput = z.infer<typeof updateMediaSchema>;
export type BulkDeleteMediaInput = z.infer<typeof bulkDeleteMediaSchema>;
export type MediaListQuery = z.infer<typeof mediaListQuerySchema>;
export type R2SettingsInput = z.infer<typeof r2SettingsSchema>;

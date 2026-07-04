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

export const bulkMediaIdsSchema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(100),
});

export const bulkDeleteMediaSchema = bulkMediaIdsSchema;

export const bulkTrashMediaSchema = bulkMediaIdsSchema;

export const bulkRestoreMediaSchema = bulkMediaIdsSchema;

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

const dimensionSchema = z.number().int().min(1).max(8192);

export const transformOpSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('resize'),
    width: dimensionSchema.optional(),
    height: dimensionSchema.optional(),
    fit: z.enum(['cover', 'contain', 'inside']).optional(),
  }),
  z.object({
    type: z.literal('crop'),
    left: z.number().min(0),
    top: z.number().min(0),
    width: dimensionSchema,
    height: dimensionSchema,
  }),
  z.object({
    type: z.literal('rotate'),
    angle: z.number().min(-360).max(360),
  }),
  z.object({
    type: z.literal('flip'),
    axis: z.enum(['horizontal', 'vertical']),
  }),
  z.object({
    type: z.literal('compress'),
    quality: z.number().int().min(1).max(100),
    format: z.enum(['webp', 'avif', 'jpeg', 'png']).optional(),
  }),
  z.object({
    type: z.literal('convert'),
    format: z.enum(['webp', 'avif', 'jpeg', 'png']),
  }),
  z.object({
    type: z.literal('stripMetadata'),
  }),
]);

export const mediaTransformSchema = z.object({
  operations: z.array(transformOpSchema).min(1).max(20),
});

export const mediaSaveAsNewSchema = z.object({
  operations: z.array(transformOpSchema).max(20).default([]),
  metadata: mediaMetadataSchema.optional(),
});

export type MediaMetadataInput = z.infer<typeof mediaMetadataSchema>;
export type UpdateMediaInput = z.infer<typeof updateMediaSchema>;
export type BulkDeleteMediaInput = z.infer<typeof bulkDeleteMediaSchema>;
export type BulkTrashMediaInput = z.infer<typeof bulkTrashMediaSchema>;
export type BulkRestoreMediaInput = z.infer<typeof bulkRestoreMediaSchema>;
export type MediaListQuery = z.infer<typeof mediaListQuerySchema>;
export type R2SettingsInput = z.infer<typeof r2SettingsSchema>;
export type MediaTransformInput = z.infer<typeof mediaTransformSchema>;
export type MediaSaveAsNewInput = z.infer<typeof mediaSaveAsNewSchema>;

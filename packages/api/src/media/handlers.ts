import {
  bulkDeleteMediaSchema,
  bulkRestoreMediaSchema,
  bulkTrashMediaSchema,
  DEFAULT_TENANT_ID,
  MEDIA_TRASH_FOLDER,
  mediaListQuerySchema,
  mediaSaveAsNewSchema,
  mediaTransformSchema,
  updateMediaSchema,
  type MediaAsset,
  type MediaStorageStats,
  type MediaVariantFormat,
} from '@zodyk/core';
import { AuthError, logAuditEvent, requirePermission, type AuthSession } from '@zodyk/auth';
import { connectDatabase, getModels } from '@zodyk/database';
import {
  applyTransforms,
  buildStorageKey,
  deleteFromR2,
  getObject,
  getPublicUrl,
  isImageMime,
  isStorageFullyConfigured,
  MediaNotConfiguredError,
  moveInR2,
  reprocessMediaAsset,
  resolveFilenameForFormat,
  uploadToR2,
} from '@zodyk/media';
import type { IMediaAsset } from '@zodyk/database';

const DEFAULT_QUOTA_BYTES = 100 * 1024 * 1024 * 1024;

function deriveNewFilename(originalFilename: string, title?: string): string {
  const ext = originalFilename.match(/\.[^.]+$/)?.[0] ?? '.jpg';
  if (title?.trim()) {
    const safe = title.trim().replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120);
    if (safe) return `${safe}${ext}`;
  }
  const stem = originalFilename.replace(/\.[^.]+$/, '') || 'image';
  return `${stem}-edited${ext}`;
}

async function ensureDb() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is required');
  await connectDatabase(uri);
  return getModels();
}

function resolveDimensions(doc: IMediaAsset): { width?: number; height?: number } {
  if (doc.width && doc.height) {
    return { width: doc.width, height: doc.height };
  }
  const firstVariant = doc.variants[0];
  if (firstVariant) {
    return { width: firstVariant.width, height: firstVariant.height };
  }
  return {};
}

async function toMediaAsset(doc: IMediaAsset): Promise<MediaAsset> {
  const url = await getPublicUrl(doc.r2Key);
  const variantUrls: Partial<Record<MediaVariantFormat, string>> = {};

  for (const variant of doc.variants) {
    variantUrls[variant.format] = await getPublicUrl(variant.r2Key);
  }

  const { width, height } = resolveDimensions(doc);

  return {
    id: doc._id.toString(),
    filename: doc.filename,
    originalFilename: doc.originalFilename,
    mimeType: doc.mimeType,
    size: doc.size,
    width,
    height,
    folder: doc.folder,
    r2Key: doc.r2Key,
    variants: doc.variants,
    metadata: doc.metadata ?? {},
    uploadedBy: doc.uploadedBy?.toString(),
    url,
    variantUrls,
    deletedAt: doc.deletedAt,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export async function getMediaConfigStatus(session: AuthSession | null) {
  requirePermission(session, 'media:read');
  const configured = await isStorageFullyConfigured();
  return { configured };
}

export async function listMedia(session: AuthSession | null, query: unknown) {
  requirePermission(session, 'media:read');
  const parsed = mediaListQuerySchema.parse(query);
  const { MediaAsset } = await ensureDb();

  const filter: Record<string, unknown> = { tenantId: DEFAULT_TENANT_ID };
  const isTrash = parsed.folder === MEDIA_TRASH_FOLDER;

  if (isTrash) {
    filter.deletedAt = { $exists: true };
  } else {
    filter.deletedAt = { $exists: false };
    if (parsed.folder && parsed.folder !== '/') {
      filter.folder = parsed.folder;
    }
  }
  if (parsed.mimeType) {
    filter.mimeType = { $regex: `^${parsed.mimeType.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}` };
  }
  if (parsed.search) {
    const escaped = parsed.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.$or = [
      { originalFilename: { $regex: escaped, $options: 'i' } },
      { filename: { $regex: escaped, $options: 'i' } },
      { 'metadata.title': { $regex: escaped, $options: 'i' } },
      { 'metadata.alt': { $regex: escaped, $options: 'i' } },
    ];
  }

  const skip = (parsed.page - 1) * parsed.limit;
  const [items, total] = await Promise.all([
    MediaAsset.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parsed.limit),
    MediaAsset.countDocuments(filter),
  ]);

  const data = await Promise.all(items.map((item) => toMediaAsset(item)));
  return {
    data,
    pagination: {
      page: parsed.page,
      limit: parsed.limit,
      total,
      totalPages: Math.ceil(total / parsed.limit),
    },
  };
}

export async function listMediaFolders(session: AuthSession | null) {
  requirePermission(session, 'media:read');
  const { MediaAsset } = await ensureDb();

  const activeMatch = { tenantId: DEFAULT_TENANT_ID, deletedAt: { $exists: false } };

  const [folders, counts, trashCount, totalCount] = await Promise.all([
    MediaAsset.distinct('folder', activeMatch),
    MediaAsset.aggregate<{ _id: string; count: number }>([
      { $match: activeMatch },
      { $group: { _id: '$folder', count: { $sum: 1 } } },
    ]),
    MediaAsset.countDocuments({ tenantId: DEFAULT_TENANT_ID, deletedAt: { $exists: true } }),
    MediaAsset.countDocuments(activeMatch),
  ]);

  const countMap = new Map(counts.map((c) => [c._id, c.count]));
  const normalized = Array.from(new Set(['/', ...folders.filter(Boolean)])).sort();

  return {
    folders: [
      ...normalized.map((folder) => ({
        folder,
        count: folder === '/' ? totalCount : (countMap.get(folder) ?? 0),
      })),
      { folder: MEDIA_TRASH_FOLDER, count: trashCount },
    ],
  };
}

export async function getMediaAsset(session: AuthSession | null, id: string) {
  requirePermission(session, 'media:read');
  const { MediaAsset } = await ensureDb();

  const item = await MediaAsset.findOne({
    _id: id,
    tenantId: DEFAULT_TENANT_ID,
    deletedAt: { $exists: false },
  });
  if (!item) throw new AuthError('Media not found', 404);
  return toMediaAsset(item);
}

type MediaFileVariant = 'original' | 'webp' | 'avif';

export async function getMediaAssetFile(
  session: AuthSession | null,
  id: string,
  variant: MediaFileVariant = 'webp',
): Promise<{ body: Buffer; mimeType: string }> {
  requirePermission(session, 'media:read');
  const { MediaAsset } = await ensureDb();

  const item = await MediaAsset.findOne({ _id: id, tenantId: DEFAULT_TENANT_ID });
  if (!item) throw new AuthError('Media not found', 404);

  let r2Key = item.r2Key;
  let mimeType = item.mimeType;

  if (variant !== 'original') {
    const match = item.variants.find((v) => v.format === variant);
    if (match) {
      r2Key = match.r2Key;
      mimeType = variant === 'webp' ? 'image/webp' : 'image/avif';
    }
  }

  if (!r2Key || r2Key === 'pending') {
    throw new AuthError('Media file is not ready', 400);
  }

  const body = await getObject(r2Key);
  return { body, mimeType };
}

export async function uploadMediaAsset(
  session: AuthSession | null,
  formData: FormData,
  ip?: string,
) {
  requirePermission(session, 'media:upload');

  const file = formData.get('file');
  if (!(file instanceof File)) {
    throw new AuthError('File is required', 400);
  }

  const folder = (formData.get('folder') as string | null) ?? '/';
  const alt = (formData.get('alt') as string | null) ?? undefined;
  const title = (formData.get('title') as string | null) ?? undefined;
  const caption = (formData.get('caption') as string | null) ?? undefined;

  const { MediaAsset } = await ensureDb();
  const asset = await MediaAsset.create({
    filename: file.name,
    originalFilename: file.name,
    mimeType: file.type || 'application/octet-stream',
    size: file.size,
    folder,
    r2Key: 'pending',
    variants: [],
    metadata: { alt, title, caption },
    uploadedBy: session?.userId,
    tenantId: DEFAULT_TENANT_ID,
  });

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await uploadToR2({
      buffer,
      originalFilename: file.name,
      mimeType: file.type || 'application/octet-stream',
      assetId: asset._id.toString(),
      folder,
    });

    asset.filename = result.filename;
    asset.r2Key = result.r2Key;
    asset.size = result.size;
    asset.width = result.width;
    asset.height = result.height;
    asset.variants = result.variants;
    await asset.save();
  } catch (error) {
    await MediaAsset.deleteOne({ _id: asset._id });
    if (error instanceof MediaNotConfiguredError) {
      throw new AuthError(error.message, 503);
    }
    throw error;
  }

  await logAuditEvent({
    actorId: session?.userId,
    action: 'media.upload',
    resource: 'media',
    resourceId: asset._id.toString(),
    metadata: { filename: asset.originalFilename, folder },
    ip,
  });

  return toMediaAsset(asset);
}

export async function updateMediaAsset(
  session: AuthSession | null,
  id: string,
  body: unknown,
  ip?: string,
) {
  requirePermission(session, 'media:upload');
  const parsed = updateMediaSchema.parse(body);
  const { MediaAsset } = await ensureDb();

  const item = await MediaAsset.findOne({ _id: id, tenantId: DEFAULT_TENANT_ID });
  if (!item) throw new AuthError('Media not found', 404);

  if (parsed.metadata) {
    item.metadata = { ...item.metadata, ...parsed.metadata };
  }

  if (parsed.folder && parsed.folder !== item.folder) {
    const newKey = buildStorageKey(
      DEFAULT_TENANT_ID,
      parsed.folder,
      item._id.toString(),
      item.filename,
    );
    const variantMoves = item.variants.map((v) => {
      const variantFilename = v.r2Key.split('/').pop() ?? `${v.format}`;
      const newVariantKey = buildStorageKey(
        DEFAULT_TENANT_ID,
        parsed.folder!,
        item._id.toString(),
        variantFilename,
      );
      return { oldKey: v.r2Key, newKey: newVariantKey };
    });

    await moveInR2(item.r2Key, newKey, variantMoves);
    item.r2Key = newKey;
    item.folder = parsed.folder;
    item.variants = item.variants.map((v, i) => ({
      ...v,
      r2Key: variantMoves[i]!.newKey,
    }));
  }

  await item.save();

  await logAuditEvent({
    actorId: session?.userId,
    action: 'media.update',
    resource: 'media',
    resourceId: id,
    metadata: parsed,
    ip,
  });

  return toMediaAsset(item);
}

export async function trashMediaAsset(session: AuthSession | null, id: string, ip?: string) {
  requirePermission(session, 'media:delete');
  const { MediaAsset } = await ensureDb();

  const item = await MediaAsset.findOne({
    _id: id,
    tenantId: DEFAULT_TENANT_ID,
    deletedAt: { $exists: false },
  });
  if (!item) throw new AuthError('Media not found', 404);

  item.deletedAt = new Date();
  await item.save();

  await logAuditEvent({
    actorId: session?.userId,
    action: 'media.trash',
    resource: 'media',
    resourceId: id,
    ip,
  });

  return { success: true };
}

export async function bulkTrashMediaAssets(
  session: AuthSession | null,
  body: unknown,
  ip?: string,
) {
  requirePermission(session, 'media:delete');
  const parsed = bulkTrashMediaSchema.parse(body);

  for (const id of parsed.ids) {
    await trashMediaAsset(session, id, ip);
  }

  return { success: true, trashed: parsed.ids.length };
}

export async function restoreMediaAsset(session: AuthSession | null, id: string, ip?: string) {
  requirePermission(session, 'media:delete');
  const { MediaAsset } = await ensureDb();

  const item = await MediaAsset.findOne({
    _id: id,
    tenantId: DEFAULT_TENANT_ID,
    deletedAt: { $exists: true },
  });
  if (!item) throw new AuthError('Media not found', 404);

  item.deletedAt = undefined;
  await item.save();

  await logAuditEvent({
    actorId: session?.userId,
    action: 'media.restore',
    resource: 'media',
    resourceId: id,
    ip,
  });

  return { success: true };
}

export async function bulkRestoreMediaAssets(
  session: AuthSession | null,
  body: unknown,
  ip?: string,
) {
  requirePermission(session, 'media:delete');
  const parsed = bulkRestoreMediaSchema.parse(body);

  for (const id of parsed.ids) {
    await restoreMediaAsset(session, id, ip);
  }

  return { success: true, restored: parsed.ids.length };
}

export async function emptyMediaTrash(session: AuthSession | null, ip?: string) {
  requirePermission(session, 'media:delete');
  const { MediaAsset } = await ensureDb();

  const items = await MediaAsset.find({
    tenantId: DEFAULT_TENANT_ID,
    deletedAt: { $exists: true },
  });

  for (const item of items) {
    if (item.r2Key && item.r2Key !== 'pending') {
      await deleteFromR2(
        item.r2Key,
        item.variants.map((v) => v.r2Key),
      );
    }
    await MediaAsset.deleteOne({ _id: item._id });
  }

  await logAuditEvent({
    actorId: session?.userId,
    action: 'media.empty_trash',
    resource: 'media',
    resourceId: 'trash',
    ip,
    metadata: { count: items.length },
  });

  return { success: true, deleted: items.length };
}

export async function deleteMediaAsset(session: AuthSession | null, id: string, ip?: string) {
  requirePermission(session, 'media:delete');
  const { MediaAsset } = await ensureDb();

  const item = await MediaAsset.findOne({ _id: id, tenantId: DEFAULT_TENANT_ID });
  if (!item) throw new AuthError('Media not found', 404);

  if (item.r2Key && item.r2Key !== 'pending') {
    await deleteFromR2(
      item.r2Key,
      item.variants.map((v) => v.r2Key),
    );
  }

  await MediaAsset.deleteOne({ _id: item._id });

  await logAuditEvent({
    actorId: session?.userId,
    action: 'media.delete',
    resource: 'media',
    resourceId: id,
    ip,
  });

  return { success: true };
}

export async function bulkDeleteMediaAssets(
  session: AuthSession | null,
  body: unknown,
  ip?: string,
) {
  requirePermission(session, 'media:delete');
  const parsed = bulkDeleteMediaSchema.parse(body);

  for (const id of parsed.ids) {
    await deleteMediaAsset(session, id, ip);
  }

  return { success: true, deleted: parsed.ids.length };
}

export async function getMediaStats(session: AuthSession | null): Promise<MediaStorageStats> {
  requirePermission(session, 'media:read');
  const { MediaAsset } = await ensureDb();

  const baseMatch = { tenantId: DEFAULT_TENANT_ID, deletedAt: { $exists: false } };

  const [totals, images, videos, documents] = await Promise.all([
    MediaAsset.aggregate<{ totalBytes: number; totalCount: number }>([
      { $match: baseMatch },
      {
        $group: {
          _id: null,
          totalBytes: { $sum: '$size' },
          totalCount: { $sum: 1 },
        },
      },
    ]),
    MediaAsset.aggregate<{ bytes: number; count: number }>([
      { $match: { ...baseMatch, mimeType: { $regex: '^image/' } } },
      { $group: { _id: null, bytes: { $sum: '$size' }, count: { $sum: 1 } } },
    ]),
    MediaAsset.aggregate<{ bytes: number; count: number }>([
      { $match: { ...baseMatch, mimeType: { $regex: '^video/' } } },
      { $group: { _id: null, bytes: { $sum: '$size' }, count: { $sum: 1 } } },
    ]),
    MediaAsset.aggregate<{ bytes: number; count: number }>([
      { $match: { ...baseMatch, mimeType: { $not: { $regex: '^(image|video)/' } } } },
      { $group: { _id: null, bytes: { $sum: '$size' }, count: { $sum: 1 } } },
    ]),
  ]);

  const quotaBytes = Number(process.env.MEDIA_STORAGE_QUOTA_BYTES) || DEFAULT_QUOTA_BYTES;

  return {
    totalBytes: totals[0]?.totalBytes ?? 0,
    totalCount: totals[0]?.totalCount ?? 0,
    imagesBytes: images[0]?.bytes ?? 0,
    imagesCount: images[0]?.count ?? 0,
    videoBytes: videos[0]?.bytes ?? 0,
    videoCount: videos[0]?.count ?? 0,
    documentsBytes: documents[0]?.bytes ?? 0,
    documentsCount: documents[0]?.count ?? 0,
    quotaBytes,
  };
}

export async function transformMediaAsset(
  session: AuthSession | null,
  id: string,
  body: unknown,
  ip?: string,
) {
  requirePermission(session, 'media:upload');
  const parsed = mediaTransformSchema.parse(body);
  const { MediaAsset } = await ensureDb();

  const item = await MediaAsset.findOne({ _id: id, tenantId: DEFAULT_TENANT_ID });
  if (!item) throw new AuthError('Media not found', 404);

  if (!isImageMime(item.mimeType)) {
    throw new AuthError('Only raster images can be transformed', 400);
  }

  if (!item.r2Key || item.r2Key === 'pending') {
    throw new AuthError('Media file is not ready', 400);
  }

  try {
    const result = await reprocessMediaAsset({
      r2Key: item.r2Key,
      mimeType: item.mimeType,
      filename: item.filename,
      folder: item.folder,
      assetId: item._id.toString(),
      variantKeys: item.variants.map((v) => v.r2Key),
      operations: parsed.operations,
    });

    item.filename = result.filename;
    item.r2Key = result.r2Key;
    item.mimeType = result.mimeType;
    item.size = result.size;
    item.width = result.width;
    item.height = result.height;
    item.variants = result.variants;
    await item.save();
  } catch (error) {
    if (error instanceof MediaNotConfiguredError) {
      throw new AuthError(error.message, 503);
    }
    throw error;
  }

  await logAuditEvent({
    actorId: session?.userId,
    action: 'media.transform',
    resource: 'media',
    resourceId: id,
    metadata: { operations: parsed.operations },
    ip,
  });

  return toMediaAsset(item);
}

export async function saveMediaAssetAsNew(
  session: AuthSession | null,
  id: string,
  body: unknown,
  ip?: string,
) {
  requirePermission(session, 'media:upload');
  const parsed = mediaSaveAsNewSchema.parse(body);
  const { MediaAsset } = await ensureDb();

  const source = await MediaAsset.findOne({ _id: id, tenantId: DEFAULT_TENANT_ID });
  if (!source) throw new AuthError('Media not found', 404);

  if (!isImageMime(source.mimeType)) {
    throw new AuthError('Only raster images can be saved as new', 400);
  }

  if (!source.r2Key || source.r2Key === 'pending') {
    throw new AuthError('Media file is not ready', 400);
  }

  const sourceBuffer = await getObject(source.r2Key);
  const processed =
    parsed.operations.length > 0
      ? await applyTransforms(sourceBuffer, parsed.operations, source.mimeType)
      : {
          buffer: sourceBuffer,
          mimeType: source.mimeType,
          width: source.width ?? 0,
          height: source.height ?? 0,
          size: sourceBuffer.length,
        };

  const metadata = {
    ...source.metadata,
    ...parsed.metadata,
  };
  const originalFilename = resolveFilenameForFormat(
    deriveNewFilename(source.originalFilename, metadata.title),
    processed.mimeType,
  );

  const asset = await MediaAsset.create({
    filename: originalFilename,
    originalFilename,
    mimeType: processed.mimeType,
    size: processed.size,
    width: processed.width || undefined,
    height: processed.height || undefined,
    folder: source.folder,
    r2Key: 'pending',
    variants: [],
    metadata,
    uploadedBy: session?.userId,
    tenantId: DEFAULT_TENANT_ID,
  });

  try {
    const result = await uploadToR2({
      buffer: processed.buffer,
      originalFilename,
      mimeType: processed.mimeType,
      assetId: asset._id.toString(),
      folder: source.folder,
    });

    asset.filename = result.filename;
    asset.r2Key = result.r2Key;
    asset.size = result.size;
    asset.width = result.width;
    asset.height = result.height;
    asset.variants = result.variants;
    await asset.save();
  } catch (error) {
    await MediaAsset.deleteOne({ _id: asset._id });
    if (error instanceof MediaNotConfiguredError) {
      throw new AuthError(error.message, 503);
    }
    throw error;
  }

  await logAuditEvent({
    actorId: session?.userId,
    action: 'media.save_as_new',
    resource: 'media',
    resourceId: asset._id.toString(),
    metadata: { sourceId: id, operations: parsed.operations },
    ip,
  });

  return toMediaAsset(asset);
}

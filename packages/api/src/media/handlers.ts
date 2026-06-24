import {
  bulkDeleteMediaSchema,
  DEFAULT_TENANT_ID,
  mediaListQuerySchema,
  updateMediaSchema,
  type MediaAsset,
  type MediaVariantFormat,
} from '@zodyk/core';
import { AuthError, logAuditEvent, requirePermission, type AuthSession } from '@zodyk/auth';
import { connectDatabase, getModels } from '@zodyk/database';
import {
  buildStorageKey,
  deleteFromR2,
  getPublicUrl,
  isR2Configured,
  MediaNotConfiguredError,
  moveInR2,
  uploadToR2,
} from '@zodyk/media';
import type { IMediaAsset } from '@zodyk/database';

async function ensureDb() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is required');
  await connectDatabase(uri);
  return getModels();
}

async function toMediaAsset(doc: IMediaAsset): Promise<MediaAsset> {
  const url = await getPublicUrl(doc.r2Key);
  const variantUrls: Partial<Record<MediaVariantFormat, string>> = {};

  for (const variant of doc.variants) {
    variantUrls[variant.format] = await getPublicUrl(variant.r2Key);
  }

  return {
    id: doc._id.toString(),
    filename: doc.filename,
    originalFilename: doc.originalFilename,
    mimeType: doc.mimeType,
    size: doc.size,
    folder: doc.folder,
    r2Key: doc.r2Key,
    variants: doc.variants,
    metadata: doc.metadata ?? {},
    uploadedBy: doc.uploadedBy?.toString(),
    url,
    variantUrls,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export async function getMediaConfigStatus(session: AuthSession | null) {
  requirePermission(session, 'media:read');
  const configured = await isR2Configured();
  return { configured };
}

export async function listMedia(session: AuthSession | null, query: unknown) {
  requirePermission(session, 'media:read');
  const parsed = mediaListQuerySchema.parse(query);
  const { MediaAsset } = await ensureDb();

  const filter: Record<string, unknown> = { tenantId: DEFAULT_TENANT_ID };
  if (parsed.folder) {
    filter.folder = parsed.folder;
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

  const folders = await MediaAsset.distinct('folder', { tenantId: DEFAULT_TENANT_ID });
  const normalized = Array.from(new Set(['/', ...folders.filter(Boolean)])).sort();
  return { folders: normalized };
}

export async function getMediaAsset(session: AuthSession | null, id: string) {
  requirePermission(session, 'media:read');
  const { MediaAsset } = await ensureDb();

  const item = await MediaAsset.findOne({ _id: id, tenantId: DEFAULT_TENANT_ID });
  if (!item) throw new AuthError('Media not found', 404);
  return toMediaAsset(item);
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

export async function deleteMediaAsset(session: AuthSession | null, id: string, ip?: string) {
  requirePermission(session, 'media:delete');
  const { MediaAsset } = await ensureDb();

  const item = await MediaAsset.findOne({ _id: id, tenantId: DEFAULT_TENANT_ID });
  if (!item) throw new AuthError('Media not found', 404);

  try {
    await deleteFromR2(
      item.r2Key,
      item.variants.map((v) => v.r2Key),
    );
  } catch (error) {
    if (!(error instanceof MediaNotConfiguredError)) {
      throw error;
    }
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

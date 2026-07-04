import { PutObjectCommand } from '@aws-sdk/client-s3';
import { DEFAULT_TENANT_ID, type TransformOp } from '@zodyk/core';
import type { IMediaVariant } from '@zodyk/database';
import { getR2Client } from './client';
import { getObject } from './objects';
import { buildMediaObjectKey } from './objects';
import {
  applyTransforms,
  generateVariants,
  isImageMime,
  resolveFilenameForFormat,
} from './image-processing';
import { deleteFromR2 } from './upload';

export interface ReprocessMediaInput {
  r2Key: string;
  mimeType: string;
  filename: string;
  folder: string;
  assetId: string;
  tenantId?: string;
  variantKeys: string[];
  operations: TransformOp[];
}

export interface ReprocessMediaResult {
  filename: string;
  r2Key: string;
  mimeType: string;
  size: number;
  width: number;
  height: number;
  variants: IMediaVariant[];
}

export async function reprocessMediaAsset(input: ReprocessMediaInput): Promise<ReprocessMediaResult> {
  if (!isImageMime(input.mimeType)) {
    throw new Error('Only raster images can be reprocessed');
  }

  const buffer = await getObject(input.r2Key);
  const processed = await applyTransforms(buffer, input.operations, input.mimeType);

  const tenantId = input.tenantId ?? DEFAULT_TENANT_ID;
  const newFilename = resolveFilenameForFormat(input.filename, processed.mimeType);
  const newR2Key = buildMediaObjectKey(tenantId, input.folder, input.assetId, newFilename);

  const { client, bucket } = await getR2Client();
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: newR2Key,
      Body: processed.buffer,
      ContentType: processed.mimeType,
    }),
  );

  const variants = await generateVariants({
    buffer: processed.buffer,
    filename: newFilename,
    tenantId,
    folder: input.folder,
    assetId: input.assetId,
  });

  const keysToDelete = [input.r2Key, ...input.variantKeys].filter(
    (key) => key !== newR2Key && !variants.some((v) => v.r2Key === key),
  );
  if (keysToDelete.length > 0) {
    await deleteFromR2(keysToDelete[0]!, keysToDelete.slice(1));
  }

  return {
    filename: newFilename,
    r2Key: newR2Key,
    mimeType: processed.mimeType,
    size: processed.size,
    width: processed.width,
    height: processed.height,
    variants,
  };
}

import { CopyObjectCommand, DeleteObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import type { Metadata } from 'sharp';
import { DEFAULT_TENANT_ID } from '@zodyk/core';
import type { IMediaVariant } from '@zodyk/database';
import { buildMediaObjectKey } from './objects';
import { getR2Client } from './client';
import { loadSharp } from './load-sharp';
import { generateVariants, isImageMime } from './image-processing';
import {
  MediaValidationError,
  SHARP_INPUT_OPTIONS,
  assertImageWithinPixelLimit,
  validateMediaUpload,
} from './upload-policy';

export interface UploadMediaInput {
  buffer: Buffer;
  originalFilename: string;
  mimeType: string;
  tenantId?: string;
  assetId: string;
  folder?: string;
}

export interface UploadMediaResult {
  filename: string;
  r2Key: string;
  size: number;
  width?: number;
  height?: number;
  variants: IMediaVariant[];
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 200);
}

function buildKey(
  tenantId: string,
  folder: string,
  assetId: string,
  filename: string,
): string {
  return buildMediaObjectKey(tenantId, folder, assetId, filename);
}

export async function uploadToR2(input: UploadMediaInput): Promise<UploadMediaResult> {
  const { mimeType } = validateMediaUpload({
    buffer: input.buffer,
    filename: input.originalFilename,
    declaredMimeType: input.mimeType,
  });

  const { client, bucket } = await getR2Client();
  const tenantId = input.tenantId ?? DEFAULT_TENANT_ID;
  const folder = input.folder ?? '/';
  const filename = sanitizeFilename(input.originalFilename);
  const r2Key = buildKey(tenantId, folder, input.assetId, filename);

  let variants: IMediaVariant[] = [];
  let width: number | undefined;
  let height: number | undefined;

  if (isImageMime(mimeType)) {
    const sharp = await loadSharp();
    let metadata: Metadata;
    try {
      metadata = await sharp(input.buffer, SHARP_INPUT_OPTIONS).rotate().metadata();
    } catch {
      throw new MediaValidationError('Invalid or oversized image');
    }
    assertImageWithinPixelLimit(metadata.width, metadata.height);
    width = metadata.width;
    height = metadata.height;
  }

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: r2Key,
      Body: input.buffer,
      ContentType: mimeType,
    }),
  );

  if (isImageMime(mimeType)) {
    try {
      variants = await generateVariants({
        buffer: input.buffer,
        filename,
        tenantId,
        folder,
        assetId: input.assetId,
      });
    } catch (error) {
      // Do not leave the original object behind when variant generation fails.
      await client
        .send(new DeleteObjectCommand({ Bucket: bucket, Key: r2Key }))
        .catch(() => undefined);
      throw error;
    }
  }

  return {
    filename,
    r2Key,
    size: input.buffer.length,
    width,
    height,
    variants,
  };
}

export async function deleteFromR2(r2Key: string, variantKeys: string[] = []): Promise<void> {
  const { client, bucket } = await getR2Client();
  const keys = [r2Key, ...variantKeys];

  await Promise.all(
    keys.map((Key) =>
      client.send(
        new DeleteObjectCommand({
          Bucket: bucket,
          Key,
        }),
      ),
    ),
  );
}

export async function moveInR2(
  oldKey: string,
  newKey: string,
  variantMoves: Array<{ oldKey: string; newKey: string }>,
): Promise<void> {
  const { client, bucket } = await getR2Client();

  const copyAndDelete = async (from: string, to: string) => {
    await client.send(
      new CopyObjectCommand({
        Bucket: bucket,
        CopySource: `${bucket}/${from}`,
        Key: to,
      }),
    );
    await client.send(
      new DeleteObjectCommand({
        Bucket: bucket,
        Key: from,
      }),
    );
  };

  await copyAndDelete(oldKey, newKey);
  for (const move of variantMoves) {
    await copyAndDelete(move.oldKey, move.newKey);
  }
}

export function buildStorageKey(
  tenantId: string,
  folder: string,
  assetId: string,
  filename: string,
): string {
  return buildKey(tenantId, folder, assetId, filename);
}

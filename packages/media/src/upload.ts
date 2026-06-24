import { CopyObjectCommand, DeleteObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { DEFAULT_TENANT_ID } from '@zodyk/core';
import type { IMediaVariant } from '@zodyk/database';
import { getR2Client } from './client';
import { loadSharp } from './load-sharp';

const MAX_IMAGE_WIDTH = 2560;

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
  const normalizedFolder = folder === '/' ? '' : folder.replace(/^\//, '').replace(/\/$/, '');
  const parts = [tenantId, normalizedFolder, assetId, filename].filter(Boolean);
  return parts.join('/');
}

function isImageMime(mimeType: string): boolean {
  return mimeType.startsWith('image/') && !mimeType.includes('svg');
}

export async function uploadToR2(input: UploadMediaInput): Promise<UploadMediaResult> {
  const { client, bucket } = await getR2Client();
  const tenantId = input.tenantId ?? DEFAULT_TENANT_ID;
  const folder = input.folder ?? '/';
  const filename = sanitizeFilename(input.originalFilename);
  const r2Key = buildKey(tenantId, folder, input.assetId, filename);

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: r2Key,
      Body: input.buffer,
      ContentType: input.mimeType,
    }),
  );

  const variants: IMediaVariant[] = [];

  if (isImageMime(input.mimeType)) {
    const sharp = await loadSharp();
    const image = sharp(input.buffer).rotate();
    const metadata = await image.metadata();
    const width = metadata.width ?? MAX_IMAGE_WIDTH;
    const resizeWidth = Math.min(width, MAX_IMAGE_WIDTH);

    const resized = image.resize({ width: resizeWidth, withoutEnlargement: true });

    const [webpBuffer, avifBuffer, webpMeta, avifMeta] = await Promise.all([
      resized.clone().webp({ quality: 82 }).toBuffer(),
      resized.clone().avif({ quality: 65 }).toBuffer(),
      resized.clone().webp({ quality: 82 }).toBuffer({ resolveWithObject: true }),
      resized.clone().avif({ quality: 65 }).toBuffer({ resolveWithObject: true }),
    ]);

    const webpFilename = filename.replace(/\.[^.]+$/, '') + '.webp';
    const avifFilename = filename.replace(/\.[^.]+$/, '') + '.avif';
    const webpKey = buildKey(tenantId, folder, input.assetId, webpFilename);
    const avifKey = buildKey(tenantId, folder, input.assetId, avifFilename);

    await Promise.all([
      client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: webpKey,
          Body: webpBuffer,
          ContentType: 'image/webp',
        }),
      ),
      client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: avifKey,
          Body: avifBuffer,
          ContentType: 'image/avif',
        }),
      ),
    ]);

    variants.push(
      {
        format: 'webp',
        r2Key: webpKey,
        width: webpMeta.info.width ?? resizeWidth,
        height: webpMeta.info.height ?? 0,
        size: webpBuffer.length,
      },
      {
        format: 'avif',
        r2Key: avifKey,
        width: avifMeta.info.width ?? resizeWidth,
        height: avifMeta.info.height ?? 0,
        size: avifBuffer.length,
      },
    );
  }

  return {
    filename,
    r2Key,
    size: input.buffer.length,
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

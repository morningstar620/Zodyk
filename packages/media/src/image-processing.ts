import { DeleteObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import type { Metadata } from 'sharp';
import { DEFAULT_TENANT_ID } from '@zodyk/core';
import type { IMediaVariant } from '@zodyk/database';
import type { TransformOp } from '@zodyk/core';
import { buildMediaObjectKey } from './objects';
import { getR2Client } from './client';
import { loadSharp } from './load-sharp';
import {
  MediaValidationError,
  SHARP_INPUT_OPTIONS,
  assertImageWithinPixelLimit,
} from './upload-policy';

export const MAX_IMAGE_WIDTH = 2560;
export const MAX_DIMENSION = 8192;

export interface ProcessedImage {
  buffer: Buffer;
  mimeType: string;
  width: number;
  height: number;
  size: number;
}

export function isImageMime(mimeType: string): boolean {
  return mimeType.startsWith('image/') && !mimeType.includes('svg');
}

function mimeForFormat(format: string): string {
  switch (format) {
    case 'webp':
      return 'image/webp';
    case 'avif':
      return 'image/avif';
    case 'jpeg':
    case 'jpg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    default:
      return 'image/jpeg';
  }
}

function extensionForFormat(format: string): string {
  switch (format) {
    case 'webp':
      return 'webp';
    case 'avif':
      return 'avif';
    case 'jpeg':
      return 'jpg';
    case 'png':
      return 'png';
    default:
      return 'jpg';
  }
}

export async function applyTransforms(
  buffer: Buffer,
  ops: TransformOp[],
  sourceMimeType: string,
): Promise<ProcessedImage> {
  if (!isImageMime(sourceMimeType)) {
    throw new Error('Transforms are only supported for raster images');
  }

  const sharp = await loadSharp();
  let pipeline = sharp(buffer, SHARP_INPUT_OPTIONS).rotate();

  let outputFormat: 'webp' | 'avif' | 'jpeg' | 'png' | null = null;
  let quality = 82;

  for (const op of ops) {
    switch (op.type) {
      case 'resize': {
        const resizeOpts: { width?: number; height?: number; fit?: 'cover' | 'contain' | 'inside' } =
          {};
        if (op.width) resizeOpts.width = Math.min(op.width, MAX_DIMENSION);
        if (op.height) resizeOpts.height = Math.min(op.height, MAX_DIMENSION);
        if (op.fit) resizeOpts.fit = op.fit;
        pipeline = pipeline.resize({
          ...resizeOpts,
          withoutEnlargement: true,
        });
        break;
      }
      case 'crop':
        pipeline = pipeline.extract({
          left: Math.max(0, Math.round(op.left)),
          top: Math.max(0, Math.round(op.top)),
          width: Math.min(Math.round(op.width), MAX_DIMENSION),
          height: Math.min(Math.round(op.height), MAX_DIMENSION),
        });
        break;
      case 'rotate':
        pipeline = pipeline.rotate(op.angle);
        break;
      case 'flip':
        pipeline = op.axis === 'horizontal' ? pipeline.flop() : pipeline.flip();
        break;
      case 'compress':
        quality = op.quality;
        if (op.format) outputFormat = op.format;
        break;
      case 'convert':
        outputFormat = op.format;
        break;
      case 'stripMetadata':
        pipeline = pipeline.withMetadata({ exif: {} });
        break;
    }
  }

  let meta: Metadata;
  try {
    meta = await pipeline.metadata();
  } catch {
    throw new MediaValidationError('Invalid or oversized image');
  }
  assertImageWithinPixelLimit(meta.width, meta.height);
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;

  let resultBuffer: Buffer;
  let mimeType = sourceMimeType;
  let finalMeta: Metadata;

  try {
    if (outputFormat) {
      mimeType = mimeForFormat(outputFormat);
      switch (outputFormat) {
        case 'webp':
          resultBuffer = await pipeline.webp({ quality }).toBuffer();
          break;
        case 'avif':
          resultBuffer = await pipeline.avif({ quality: Math.min(quality, 80) }).toBuffer();
          break;
        case 'jpeg':
          resultBuffer = await pipeline.jpeg({ quality }).toBuffer();
          break;
        case 'png':
          resultBuffer = await pipeline.png().toBuffer();
          break;
      }
    } else if (sourceMimeType === 'image/png') {
      resultBuffer = await pipeline.png().toBuffer();
    } else if (sourceMimeType === 'image/webp') {
      resultBuffer = await pipeline.webp({ quality }).toBuffer();
    } else if (sourceMimeType === 'image/avif') {
      resultBuffer = await pipeline.avif({ quality: Math.min(quality, 80) }).toBuffer();
    } else {
      resultBuffer = await pipeline.jpeg({ quality }).toBuffer();
      mimeType = 'image/jpeg';
    }

    finalMeta = await sharp(resultBuffer, SHARP_INPUT_OPTIONS).metadata();
  } catch {
    throw new MediaValidationError('Invalid or unsupported image');
  }

  return {
    buffer: resultBuffer,
    mimeType,
    width: finalMeta.width ?? width,
    height: finalMeta.height ?? height,
    size: resultBuffer.length,
  };
}

export interface GenerateVariantsInput {
  buffer: Buffer;
  filename: string;
  tenantId?: string;
  folder?: string;
  assetId: string;
}

export async function generateVariants(input: GenerateVariantsInput): Promise<IMediaVariant[]> {
  const sharp = await loadSharp();
  const tenantId = input.tenantId ?? DEFAULT_TENANT_ID;
  const folder = input.folder ?? '/';
  const { client, bucket } = await getR2Client();

  const image = sharp(input.buffer, SHARP_INPUT_OPTIONS).rotate();
  let metadata: Metadata;
  try {
    metadata = await image.metadata();
  } catch {
    throw new MediaValidationError('Invalid or oversized image');
  }
  assertImageWithinPixelLimit(metadata.width, metadata.height);
  const width = metadata.width ?? MAX_IMAGE_WIDTH;
  const resizeWidth = Math.min(width, MAX_IMAGE_WIDTH);
  const resized = image.resize({ width: resizeWidth, withoutEnlargement: true });

  const [webpBuffer, avifBuffer, webpMeta, avifMeta] = await (async () => {
    try {
      return await Promise.all([
        resized.clone().webp({ quality: 82 }).toBuffer(),
        resized.clone().avif({ quality: 65 }).toBuffer(),
        resized.clone().webp({ quality: 82 }).toBuffer({ resolveWithObject: true }),
        resized.clone().avif({ quality: 65 }).toBuffer({ resolveWithObject: true }),
      ]);
    } catch {
      throw new MediaValidationError('Invalid or unsupported image');
    }
  })();

  const baseName = input.filename.replace(/\.[^.]+$/, '');
  const webpFilename = `${baseName}.webp`;
  const avifFilename = `${baseName}.avif`;
  const webpKey = buildMediaObjectKey(tenantId, folder, input.assetId, webpFilename);
  const avifKey = buildMediaObjectKey(tenantId, folder, input.assetId, avifFilename);

  try {
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
  } catch (error) {
    // A parallel write may have succeeded; remove both keys before rethrowing.
    await Promise.all([
      client
        .send(new DeleteObjectCommand({ Bucket: bucket, Key: webpKey }))
        .catch(() => undefined),
      client
        .send(new DeleteObjectCommand({ Bucket: bucket, Key: avifKey }))
        .catch(() => undefined),
    ]);
    throw error;
  }

  return [
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
  ];
}

export function resolveFilenameForFormat(originalFilename: string, mimeType: string): string {
  const base = originalFilename.replace(/\.[^.]+$/, '');
  if (mimeType === 'image/png') return `${base}.png`;
  if (mimeType === 'image/webp') return `${base}.webp`;
  if (mimeType === 'image/avif') return `${base}.avif`;
  return `${base}.jpg`;
}

export { extensionForFormat, mimeForFormat };

import {
  CopyObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import { DEFAULT_TENANT_ID } from '@zodyk/core';
import { getR2Client } from './client';

export function buildThemeObjectKey(
  tenantId: string,
  themeId: string,
  path: string,
): string {
  const normalizedPath = path.replace(/^\/+/, '').replace(/\\/g, '/');
  return `${tenantId}/themes/${themeId}/${normalizedPath}`;
}

export function buildThemeStoragePrefix(tenantId: string, themeId: string): string {
  return `${tenantId}/themes/${themeId}/`;
}

export function buildMediaObjectKey(
  tenantId: string,
  folder: string,
  assetId: string,
  filename: string,
): string {
  const normalizedFolder =
    folder === '/' ? '' : folder.replace(/^\//, '').replace(/\/$/, '');
  const parts = [tenantId, 'media', normalizedFolder, assetId, filename].filter(Boolean);
  return parts.join('/');
}

export function buildMediaStoragePrefix(tenantId: string, folder = '/'): string {
  const normalizedFolder =
    folder === '/' ? '' : folder.replace(/^\//, '').replace(/\/$/, '');
  const parts = [tenantId, 'media', normalizedFolder].filter(Boolean);
  return `${parts.join('/')}/`;
}

export async function putObject(
  key: string,
  body: string | Buffer,
  contentType: string,
): Promise<void> {
  const { client, bucket } = await getR2Client();
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
}

export async function getObject(key: string): Promise<Buffer> {
  const { client, bucket } = await getR2Client();
  const response = await client.send(
    new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    }),
  );
  if (!response.Body) {
    throw new Error(`Object not found: ${key}`);
  }
  return Buffer.from(await response.Body.transformToByteArray());
}

export async function getObjectAsString(key: string): Promise<string> {
  const buffer = await getObject(key);
  return buffer.toString('utf8');
}

export async function deleteObject(key: string): Promise<void> {
  const { client, bucket } = await getR2Client();
  await client.send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    }),
  );
}

export async function deleteObjects(keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  const { client, bucket } = await getR2Client();
  const batchSize = 1000;
  for (let i = 0; i < keys.length; i += batchSize) {
    const chunk = keys.slice(i, i + batchSize);
    await client.send(
      new DeleteObjectsCommand({
        Bucket: bucket,
        Delete: {
          Objects: chunk.map((Key) => ({ Key })),
          Quiet: true,
        },
      }),
    );
  }
}

export async function listObjects(prefix: string): Promise<string[]> {
  const { client, bucket } = await getR2Client();
  const keys: string[] = [];
  let continuationToken: string | undefined;

  do {
    const response = await client.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      }),
    );
    for (const item of response.Contents ?? []) {
      if (item.Key) keys.push(item.Key);
    }
    continuationToken = response.IsTruncated ? response.NextContinuationToken : undefined;
  } while (continuationToken);

  return keys;
}

export async function copyObject(sourceKey: string, destKey: string): Promise<void> {
  const { client, bucket } = await getR2Client();
  await client.send(
    new CopyObjectCommand({
      Bucket: bucket,
      CopySource: `${bucket}/${sourceKey}`,
      Key: destKey,
    }),
  );
}

export async function copyPrefix(sourcePrefix: string, destPrefix: string): Promise<void> {
  const keys = await listObjects(sourcePrefix);
  for (const key of keys) {
    const relative = key.slice(sourcePrefix.length);
    await copyObject(key, `${destPrefix}${relative}`);
  }
}

export function defaultThemeTenantId(tenantId?: string): string {
  return tenantId ?? DEFAULT_TENANT_ID;
}

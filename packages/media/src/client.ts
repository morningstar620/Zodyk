import { S3Client } from '@aws-sdk/client-s3';
import { requireR2Config } from './config';

export async function getR2Client(): Promise<{ client: S3Client; bucket: string }> {
  const config = await requireR2Config();

  const client = new S3Client({
    region: 'auto',
    endpoint: config.endpoint,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    forcePathStyle: true,
  });

  return { client, bucket: config.bucket };
}

export async function getR2ClientFromConfig(config: {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  endpoint?: string;
}): Promise<{ client: S3Client; bucket: string }> {
  const endpoint = config.endpoint || `https://${config.accountId}.r2.cloudflarestorage.com`;

  const client = new S3Client({
    region: 'auto',
    endpoint,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    forcePathStyle: true,
  });

  return { client, bucket: config.bucket };
}

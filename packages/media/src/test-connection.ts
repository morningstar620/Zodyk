import { HeadBucketCommand } from '@aws-sdk/client-s3';
import { getR2ClientFromConfig } from './client';

export async function testR2Connection(config: {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  endpoint?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const { client, bucket } = await getR2ClientFromConfig(config);
    await client.send(new HeadBucketCommand({ Bucket: bucket }));
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Connection failed';
    return { ok: false, error: message };
  }
}

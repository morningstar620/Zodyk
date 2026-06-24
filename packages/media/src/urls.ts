import { getR2Config } from './config';

export async function getPublicUrl(r2Key: string): Promise<string> {
  const config = await getR2Config();
  if (!config) {
    return r2Key;
  }

  if (config.publicUrl) {
    const base = config.publicUrl.replace(/\/$/, '');
    return `${base}/${r2Key}`;
  }

  return `${config.endpoint}/${config.bucket}/${r2Key}`;
}

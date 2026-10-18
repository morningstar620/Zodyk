import { DEFAULT_TENANT_ID } from '@zodyk/core';
import { getModels } from '@zodyk/database';
import { getPublicUrl } from '@zodyk/media';
import { isHttpUrl } from '@zodyk/seo';
import { getShopUrl } from './site-url';

/** Turn a stored SEO image (absolute URL, site path, or media id) into a public URL. */
export async function resolvePublicImageUrl(
  value: string | undefined,
): Promise<string | undefined> {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (isHttpUrl(trimmed)) return trimmed;
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
    return new URL(trimmed, getShopUrl()).toString();
  }
  if (!/^[a-f\d]{24}$/i.test(trimmed)) return undefined;

  try {
    const { MediaAsset } = getModels();
    const asset = await MediaAsset.findOne({
      _id: trimmed,
      tenantId: DEFAULT_TENANT_ID,
      deletedAt: { $exists: false },
    }).lean();
    if (!asset) return undefined;
    const webp = asset.variants?.find((variant) => variant.format === 'webp');
    const key = webp?.r2Key ?? asset.r2Key;
    if (!key) return undefined;
    const url = await getPublicUrl(key);
    return isHttpUrl(url) ? url : undefined;
  } catch (error) {
    console.error('[website] og image lookup failed:', error);
    return undefined;
  }
}

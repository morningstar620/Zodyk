import { sanitizeSiteUrl } from '@zodyk/seo';

export function getShopUrl(): string {
  return sanitizeSiteUrl(process.env.WEBSITE_URL ?? process.env.NEXT_PUBLIC_WEBSITE_URL);
}

import { sanitizeSiteUrl } from './paths';

export function sitemapUrlForSite(siteUrl: string): string {
  return `${sanitizeSiteUrl(siteUrl)}/sitemap.xml`;
}

export function defaultRobotsTxt(sitemapUrl: string): string {
  return `User-agent: *\nAllow: /\n\nSitemap: ${sitemapUrl}\n`;
}

/**
 * Use the admin-authored robots.txt when present. The sitemap URL is appended
 * when the custom file does not already declare one.
 */
export function buildRobotsTxt(custom: string | undefined | null, sitemapUrl: string): string {
  const trimmed = custom?.replace(/\r\n/g, '\n').trim();
  if (!trimmed) return defaultRobotsTxt(sitemapUrl);
  const body = trimmed.endsWith('\n') ? trimmed : `${trimmed}\n`;
  if (/^sitemap:/im.test(body)) return body;
  return `${body}\nSitemap: ${sitemapUrl}\n`;
}

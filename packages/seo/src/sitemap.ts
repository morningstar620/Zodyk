import { isNoIndex, textField } from './fields';
import { escapeXml, isHttpUrl } from './html';
import { absoluteUrl, metaEntryPublicPath, pagePublicPath } from './paths';

export interface SitemapEntry {
  loc: string;
  lastmod?: string | Date;
}

export interface SitemapPageSource {
  slug: string;
  updatedAt?: string | Date;
  robots?: string;
  status?: string;
}

export interface SitemapMetaSource {
  handle: string;
  definitionSlug: string;
  singlePath?: string;
  updatedAt?: string | Date;
  robots?: string;
  status?: string;
}

function formatLastmod(value: string | Date | undefined): string | undefined {
  if (!value) return undefined;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString();
}

function isPublicStatus(status: string | undefined): boolean {
  return !status || status === 'published';
}

export function collectSitemapEntries(options: {
  siteUrl: string;
  pages: SitemapPageSource[];
  metaEntries: SitemapMetaSource[];
}): SitemapEntry[] {
  const entries: SitemapEntry[] = [];

  for (const page of options.pages) {
    if (!isPublicStatus(page.status) || isNoIndex(page.robots)) continue;
    const slug = textField(page.slug);
    if (!slug) continue;
    entries.push({
      loc: absoluteUrl(options.siteUrl, pagePublicPath(slug)),
      lastmod: page.updatedAt,
    });
  }

  for (const entry of options.metaEntries) {
    if (!isPublicStatus(entry.status) || isNoIndex(entry.robots)) continue;
    const handle = textField(entry.handle);
    const definitionSlug = textField(entry.definitionSlug);
    if (!handle || !definitionSlug) continue;
    entries.push({
      loc: absoluteUrl(
        options.siteUrl,
        metaEntryPublicPath(entry.singlePath, definitionSlug, handle),
      ),
      lastmod: entry.updatedAt,
    });
  }

  return entries;
}

export function buildSitemapXml(entries: SitemapEntry[]): string {
  const seen = new Set<string>();
  const urls: string[] = [];

  for (const entry of entries) {
    if (!isHttpUrl(entry.loc) || seen.has(entry.loc)) continue;
    seen.add(entry.loc);
    const lastmod = formatLastmod(entry.lastmod);
    const lastmodTag = lastmod ? `\n    <lastmod>${escapeXml(lastmod)}</lastmod>` : '';
    urls.push(`  <url>\n    <loc>${escapeXml(entry.loc)}</loc>${lastmodTag}\n  </url>`);
  }

  const body = urls.length > 0 ? `${urls.join('\n')}\n` : '';
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}</urlset>\n`;
}

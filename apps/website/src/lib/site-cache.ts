import { DEFAULT_TENANT_ID } from '@zodyk/core';
import {
  connectDatabase,
  findNextScheduledAt,
  getModels,
  promoteDueScheduledContent,
} from '@zodyk/database';
import { loadActiveTheme, type LoadedTheme } from '@zodyk/theme-engine';

/** Rely on publish/revalidate invalidation rather than short expiry. */
const TTL_MS = process.env.NODE_ENV === 'development' ? 5 * 60_000 : 15 * 60_000;
const HTML_TTL_MS = process.env.NODE_ENV === 'development' ? 5 * 60_000 : 15 * 60_000;

interface SiteData {
  theme: LoadedTheme;
  pages: Awaited<ReturnType<typeof loadPages>>;
  metaDefinitions: Awaited<ReturnType<typeof loadMetaDefinitions>>;
  menus: Awaited<ReturnType<typeof loadMenus>>;
  fetchedAt: number;
}

interface CachedPage {
  html: string;
  status: number;
  fetchedAt: number;
}

let siteDataCache: SiteData | null = null;
let nextScheduledAtMs: number | null = null;
const pageHtmlCache = new Map<string, CachedPage>();

function scheduleIsDue(now = Date.now()): boolean {
  return nextScheduledAtMs != null && now >= nextScheduledAtMs;
}

async function loadPages() {
  const { Page } = getModels();
  return Page.find({ tenantId: DEFAULT_TENANT_ID, status: 'published' }).lean();
}

async function loadMetaDefinitions() {
  const { MetaObjectDefinition } = getModels();
  return MetaObjectDefinition.find({ tenantId: DEFAULT_TENANT_ID, status: 'active' }).lean();
}

async function loadMenus() {
  const { Menu } = getModels();
  return Menu.find({ tenantId: DEFAULT_TENANT_ID }).sort({ title: 1 }).lean();
}

export async function getSiteData(uri: string): Promise<SiteData | null> {
  await connectDatabase(uri);

  const now = Date.now();
  if (siteDataCache && now - siteDataCache.fetchedAt < TTL_MS && !scheduleIsDue(now)) {
    return siteDataCache;
  }

  const promoted = await promoteDueScheduledContent(new Date(now));
  if (promoted.pages + promoted.entries > 0) {
    pageHtmlCache.clear();
  }
  const nextScheduledAt = await findNextScheduledAt(new Date());
  nextScheduledAtMs = nextScheduledAt ? nextScheduledAt.getTime() : null;

  const theme = await loadActiveTheme(DEFAULT_TENANT_ID);
  if (!theme) return null;

  const [pages, metaDefinitions, menus] = await Promise.all([
    loadPages(),
    loadMetaDefinitions(),
    loadMenus(),
  ]);

  siteDataCache = {
    theme,
    pages,
    metaDefinitions,
    menus,
    fetchedAt: Date.now(),
  };

  return siteDataCache;
}

export function getCachedPageHtml(pathname: string): CachedPage | null {
  if (scheduleIsDue()) {
    pageHtmlCache.clear();
    siteDataCache = null;
    return null;
  }
  const cached = pageHtmlCache.get(pathname);
  if (!cached || Date.now() - cached.fetchedAt >= HTML_TTL_MS) {
    pageHtmlCache.delete(pathname);
    return null;
  }
  return cached;
}

export function setCachedPageHtml(pathname: string, html: string, status: number): void {
  pageHtmlCache.set(pathname, { html, status, fetchedAt: Date.now() });
}

export function invalidateSiteCache(): void {
  siteDataCache = null;
  pageHtmlCache.clear();
  nextScheduledAtMs = null;
}

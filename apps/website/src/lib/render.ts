import { DEFAULT_TENANT_ID } from '@zodyk/core';
import { getModels } from '@zodyk/database';
import {
  getTemplateCustomization,
  getThemeAssetFile,
  loadThemeByPreview,
  metaObjectToLiquid,
  menusToLinklists,
  pageToLiquid,
  renderThemedPage,
  resolveRoute,
  type LoadedTheme,
} from '@zodyk/theme-engine';
import { cookies } from 'next/headers';
import {
  createRequestTimings,
  logSlowRender,
  type RequestTimings,
} from './request-timing';
import { getCachedPageHtml, getSiteData, setCachedPageHtml, invalidateSiteCache } from './site-cache';

export { invalidateSiteCache };

export interface RenderSiteOptions {
  previewThemeId?: string;
  previewToken?: string;
  designMode?: boolean;
}

export interface RenderSiteResult {
  html: string;
  status: number;
  timings: Record<string, number>;
  cacheHit: boolean;
}

function getShopUrl(): string {
  return process.env.WEBSITE_URL ?? process.env.NEXT_PUBLIC_WEBSITE_URL ?? 'http://localhost:3001';
}

type StoredMenuItem = { label: string; url: string; type: string; items?: StoredMenuItem[] };

type MappedMenuItem = {
  label: string;
  url: string;
  type: string;
  items: MappedMenuItem[];
};

function mapMenuItems(items: StoredMenuItem[]): MappedMenuItem[] {
  return (items ?? []).map((item) => ({
    label: item.label,
    url: item.url,
    type: item.type,
    items: mapMenuItems(item.items ?? []),
  }));
}

function injectScripts(html: string, options: RenderSiteOptions): string {
  let result = html;
  if (options.designMode) {
    const designScript = '<script src="/zodyk-design-mode.js"></script>';
    if (!result.includes('zodyk-design-mode.js')) {
      result = result.includes('</body>')
        ? result.replace('</body>', `${designScript}</body>`)
        : `${result}${designScript}`;
    }
  } else if (!result.includes('zodyk-nav.js')) {
    const navScript = '<script src="/zodyk-nav.js" defer></script>';
    result = result.includes('</body>')
      ? result.replace('</body>', `${navScript}</body>`)
      : `${result}${navScript}`;
  }
  return result;
}

async function resolveTheme(
  options: RenderSiteOptions,
  timings?: RequestTimings,
): Promise<LoadedTheme | null> {
  const uri = process.env.MONGODB_URI;
  if (!uri) return null;

  const themeStart = performance.now();

  if (options.previewThemeId && options.previewToken) {
    const theme = await loadThemeByPreview(
      options.previewThemeId,
      options.previewToken,
      DEFAULT_TENANT_ID,
    );
    timings?.mark('theme-load', themeStart);
    return theme;
  }

  const cookieStore = await cookies();
  const cookieTheme = cookieStore.get('zodyk_preview_theme')?.value;
  const cookieToken = cookieStore.get('zodyk_preview_token')?.value;
  if (cookieTheme && cookieToken) {
    const preview = await loadThemeByPreview(cookieTheme, cookieToken, DEFAULT_TENANT_ID);
    if (preview) {
      timings?.mark('theme-load', themeStart);
      return preview;
    }
  }

  const site = await getSiteData(uri);
  timings?.mark('theme-load', themeStart);
  return site?.theme ?? null;
}

export async function renderSitePage(
  pathname: string,
  options: RenderSiteOptions = {},
): Promise<RenderSiteResult> {
  const totalStart = performance.now();
  const timings = createRequestTimings();
  const cacheKey = options.previewThemeId
    ? `preview:${options.previewThemeId}:${pathname}`
    : pathname;

  if (!options.designMode) {
    const cacheStart = performance.now();
    const cached = getCachedPageHtml(cacheKey);
    timings.mark('cache-lookup', cacheStart);
    if (cached) {
      const result = timings.finish(totalStart);
      result['cache-hit'] = 1;
      logSlowRender(pathname, result, { cacheHit: true });
      return { html: cached.html, status: cached.status, timings: result, cacheHit: true };
    }
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    return {
      html: '<h1>Database not configured</h1>',
      status: 500,
      timings: timings.finish(totalStart),
      cacheHit: false,
    };
  }

  const theme = await resolveTheme(options, timings);
  if (!theme) {
    return {
      html: '<h1>No active theme</h1><p>Install and activate a theme from the admin panel.</p>',
      status: 503,
      timings: timings.finish(totalStart),
      cacheHit: false,
    };
  }

  const siteStart = performance.now();
  const site = await getSiteData(uri);
  timings.mark('site-data', siteStart);
  if (!site) {
    return {
      html: '<h1>Site data unavailable</h1>',
      status: 503,
      timings: timings.finish(totalStart),
      cacheHit: false,
    };
  }

  const { pages, metaDefinitions, menus } = site;
  const { MetaObjectEntry } = getModels();

  const routeStart = performance.now();
  const route = await resolveRoute(pathname, {
    pages,
    metaDefinitions,
    findMetaEntries: async (slug, query) => {
      const limit = Number(query.limit ?? 12);
      const skip = Number(query.skip ?? 0);
      const sort = String(query.sort ?? '-createdAt');
      const sortField = sort.startsWith('-') ? sort.slice(1) : sort;
      const sortDir = sort.startsWith('-') ? -1 : 1;
      const filter = {
        tenantId: DEFAULT_TENANT_ID,
        metaObjectSlug: slug,
        status: 'published' as const,
        deletedAt: { $exists: false },
      };
      const [items, total] = await Promise.all([
        MetaObjectEntry.find(filter)
          .sort({ [sortField]: sortDir })
          .skip(skip)
          .limit(limit)
          .lean(),
        MetaObjectEntry.countDocuments(filter),
      ]);
      return { items, total };
    },
    findMetaEntryByHandle: async (slug, handle) =>
      MetaObjectEntry.findOne({
        tenantId: DEFAULT_TENANT_ID,
        metaObjectSlug: slug,
        handle: handle.toLowerCase(),
        status: 'published',
        deletedAt: { $exists: false },
      }).lean(),
  });
  timings.mark('route', routeStart);

  const shopUrl = getShopUrl();
  const routeMenus = menus.map((menu) => ({
    title: menu.title,
    handle: menu.handle,
    items: mapMenuItems((menu.items ?? []) as StoredMenuItem[]),
  }));
  const linklists = menusToLinklists(routeMenus, pathname);
  const baseContext = {
    shop: { name: String(theme.settings.site_name ?? 'Zodyk'), url: shopUrl, currency: 'USD' },
    request: { path: pathname, locale: 'en' },
    settings: theme.settings,
    linklists,
    menus: linklists,
  };

  let pageTemplateSuffix: string | undefined;
  let metaTemplateKey: string | undefined;
  let metaEntryTemplateSuffix: string | undefined;
  let sectionOverrides: Record<string, Record<string, unknown>> | undefined;
  let resourceId: string | undefined;
  let resourceType: 'page' | 'meta_entry' | undefined;

  if (route.view === 'page' && route.page) {
    pageTemplateSuffix = route.page.templateSuffix;
    resourceId = route.page._id.toString();
    resourceType = 'page';
  } else if (route.view === 'meta_archive' && route.metaDefinition) {
    metaTemplateKey = route.metaDefinition.templates?.templateKey ?? route.metaDefinition.slug;
  } else if (route.view === 'meta_single' && route.metaDefinition && route.metaEntry) {
    metaTemplateKey = route.metaDefinition.templates?.templateKey ?? route.metaDefinition.slug;
    metaEntryTemplateSuffix = route.metaEntry.templateSuffix;
    resourceId = route.metaEntry._id.toString();
    resourceType = 'meta_entry';
  }

  if (resourceId && resourceType) {
    const customization = await getTemplateCustomization(
      resourceType,
      resourceId,
      theme.id,
      DEFAULT_TENANT_ID,
    );
    if (customization) {
      sectionOverrides = customization.sectionOverrides;
    }
  }

  const contextInput = {
    ...baseContext,
    page:
      route.view === 'home' || route.view === 'page'
        ? (pageToLiquid(
            route.page ??
              ({
                _id: { toString: () => 'home' },
                title: 'Home',
                handle: 'home',
                slug: 'home',
                status: 'published',
              } as const),
          ) as never)
        : undefined,
    metaobject:
      route.metaEntry && route.metaDefinition
        ? metaObjectToLiquid(route.metaEntry, route.metaDefinition)
        : undefined,
    metaobjects:
      route.metaEntries && route.metaDefinition
        ? route.metaEntries.map((e) => metaObjectToLiquid(e, route.metaDefinition))
        : undefined,
    metaobject_type: route.metaDefinition
      ? {
          slug: route.metaDefinition.slug,
          name: route.metaDefinition.name,
          singular_name: route.metaDefinition.singularName,
        }
      : undefined,
    paginate: route.pagination
      ? {
          current_page: route.pagination.page,
          pages: Math.ceil(route.pagination.total / route.pagination.pageSize),
          items: route.pagination.total,
          page_size: route.pagination.pageSize,
        }
      : undefined,
  };

  const liquidStart = performance.now();
  const { html: rendered } = await renderThemedPage(theme.files, {
    view: route.view,
    pageTemplateSuffix,
    metaTemplateKey,
    metaEntryTemplateSuffix,
    sectionOverrides,
    context: contextInput as Parameters<typeof renderThemedPage>[1]['context'],
    themeId: theme.id,
    themeUpdatedAt: theme.updatedAt,
  });
  timings.mark('liquid-render', liquidStart);

  const status = route.view === 'not_found' ? 404 : 200;
  const html = injectScripts(rendered, options);
  if (!options.designMode) {
    setCachedPageHtml(cacheKey, html, status);
  }

  const result = timings.finish(totalStart);
  result['cache-hit'] = 0;
  logSlowRender(pathname, result, { cacheHit: false });
  return { html, status, timings: result, cacheHit: false };
}

export async function getThemeAsset(
  assetPath: string,
  options: RenderSiteOptions = {},
): Promise<{
  content: string;
  contentType: string;
} | null> {
  let previewThemeId = options.previewThemeId;
  let previewToken = options.previewToken;

  if (!previewThemeId || !previewToken) {
    const cookieStore = await cookies();
    previewThemeId = previewThemeId ?? cookieStore.get('zodyk_preview_theme')?.value;
    previewToken = previewToken ?? cookieStore.get('zodyk_preview_token')?.value;
  }

  return getThemeAssetFile(assetPath, {
    previewThemeId,
    previewToken,
    tenantId: DEFAULT_TENANT_ID,
  });
}

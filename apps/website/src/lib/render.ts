import { DEFAULT_TENANT_ID } from '@zodyk/core';
import { getModels } from '@zodyk/database';
import {
  getTemplateCustomization,
  loadThemeByPreview,
  metaObjectToLiquid,
  menusToLinklists,
  pageToLiquid,
  renderThemedPage,
  resolveRoute,
  type LoadedTheme,
} from '@zodyk/theme-engine';
import { cookies } from 'next/headers';
import { getCachedPageHtml, getSiteData, setCachedPageHtml, invalidateSiteCache } from './site-cache';

export { invalidateSiteCache };

export interface RenderSiteOptions {
  previewThemeId?: string;
  previewToken?: string;
  designMode?: boolean;
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

async function resolveTheme(options: RenderSiteOptions): Promise<LoadedTheme | null> {
  const uri = process.env.MONGODB_URI;
  if (!uri) return null;

  if (options.previewThemeId && options.previewToken) {
    return loadThemeByPreview(
      options.previewThemeId,
      options.previewToken,
      DEFAULT_TENANT_ID,
    );
  }

  const cookieStore = await cookies();
  const cookieTheme = cookieStore.get('zodyk_preview_theme')?.value;
  const cookieToken = cookieStore.get('zodyk_preview_token')?.value;
  if (cookieTheme && cookieToken) {
    const preview = await loadThemeByPreview(cookieTheme, cookieToken, DEFAULT_TENANT_ID);
    if (preview) return preview;
  }

  const site = await getSiteData(uri);
  return site?.theme ?? null;
}

export async function renderSitePage(
  pathname: string,
  options: RenderSiteOptions = {},
): Promise<{ html: string; status: number }> {
  const cacheKey = options.previewThemeId
    ? `preview:${options.previewThemeId}:${pathname}`
    : pathname;

  if (!options.designMode) {
    const cached = getCachedPageHtml(cacheKey);
    if (cached) return { html: cached.html, status: cached.status };
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    return { html: '<h1>Database not configured</h1>', status: 500 };
  }

  const theme = await resolveTheme(options);
  if (!theme) {
    return {
      html: '<h1>No active theme</h1><p>Install and activate a theme from the admin panel.</p>',
      status: 503,
    };
  }

  const site = await getSiteData(uri);
  if (!site) {
    return { html: '<h1>Site data unavailable</h1>', status: 503 };
  }

  const { pages, metaDefinitions, menus } = site;
  const { MetaObjectEntry } = getModels();

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

  const { html: rendered } = await renderThemedPage(theme.files, {
    view: route.view,
    pageTemplateSuffix,
    metaTemplateKey,
    metaEntryTemplateSuffix,
    sectionOverrides,
    context: contextInput as Parameters<typeof renderThemedPage>[1]['context'],
  });

  const status = route.view === 'not_found' ? 404 : 200;
  const html = injectScripts(rendered, options);
  if (!options.designMode) {
    setCachedPageHtml(cacheKey, html, status);
  }

  return { html, status };
}

export async function getThemeAsset(
  assetPath: string,
  options: RenderSiteOptions = {},
): Promise<{
  content: string;
  contentType: string;
} | null> {
  const theme = await resolveTheme({
    previewThemeId: options.previewThemeId,
    previewToken: options.previewToken,
  });
  if (!theme) return null;

  const path = `assets/${assetPath}`;
  const content = theme.files[path];
  if (!content) return null;
  const contentType = path.endsWith('.css')
    ? 'text/css'
    : path.endsWith('.js')
      ? 'application/javascript'
      : 'text/plain';
  return { content, contentType };
}

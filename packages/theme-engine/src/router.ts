import { DEFAULT_TENANT_ID } from '@zodyk/core';
import type { ViewType } from '@zodyk/core';

export interface RoutePage {
  _id: { toString(): string };
  title: string;
  slug: string;
  handle: string;
  templateSuffix?: string;
  body?: string;
  status: string;
  seo?: Record<string, unknown>;
}

export interface RouteMetaDefinition {
  slug: string;
  name: string;
  singularName?: string;
  routing?: {
    archiveEnabled?: boolean;
    archivePath?: string;
    singlePath?: string;
    handleField?: string;
  };
  templates?: {
    templateKey?: string;
  };
  display?: {
    archivePageSize?: number;
    archiveSort?: string;
  };
}

export interface RouteMetaEntry {
  _id: { toString(): string };
  handle: string;
  templateSuffix?: string;
  status: string;
  locale: string;
  data: Record<string, unknown>;
}

export interface ResolvedRoute {
  view: ViewType;
  page?: RoutePage;
  metaDefinition?: RouteMetaDefinition;
  metaEntry?: RouteMetaEntry;
  metaEntries?: RouteMetaEntry[];
  pagination?: { page: number; pageSize: number; total: number };
  slugSegments: string[];
}

function splitPath(path: string): string[] {
  return path.replace(/^\/+|\/+$/g, '').split('/').filter(Boolean);
}

function matchPattern(pattern: string, segments: string[]): Record<string, string> | null {
  const patternParts = pattern.split('/').filter(Boolean);
  if (patternParts.length !== segments.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < patternParts.length; i++) {
    const part = patternParts[i]!;
    const seg = segments[i]!;
    if (part.startsWith(':')) {
      params[part.slice(1)] = seg;
    } else if (part !== seg) {
      return null;
    }
  }
  return params;
}

export function resolveRoute(
  pathname: string,
  options: {
    pages: RoutePage[];
    metaDefinitions: RouteMetaDefinition[];
    findMetaEntries: (
      slug: string,
      query: Record<string, unknown>,
    ) => Promise<{ items: RouteMetaEntry[]; total: number }>;
    findMetaEntryByHandle: (slug: string, handle: string) => Promise<RouteMetaEntry | null>;
  },
): Promise<ResolvedRoute> {
  return resolveRouteInternal(pathname, options);
}

async function resolveRouteInternal(
  pathname: string,
  options: {
    pages: RoutePage[];
    metaDefinitions: RouteMetaDefinition[];
    findMetaEntries: (
      slug: string,
      query: Record<string, unknown>,
    ) => Promise<{ items: RouteMetaEntry[]; total: number }>;
    findMetaEntryByHandle: (slug: string, handle: string) => Promise<RouteMetaEntry | null>;
  },
): Promise<ResolvedRoute> {
  const segments = splitPath(pathname);

  if (segments.length === 0) {
    return { view: 'home', slugSegments: [] };
  }

  for (const def of options.metaDefinitions) {
    const routing = def.routing ?? { archiveEnabled: true, handleField: 'handle' };
    const archivePath = routing.archivePath ?? def.slug;
    const singlePath = routing.singlePath ?? `${def.slug}/:handle`;

    if (routing.archiveEnabled) {
      const archiveSegments = splitPath(archivePath);
      if (segments.length === archiveSegments.length && segments.join('/') === archiveSegments.join('/')) {
        const page = 1;
        const pageSize = def.display?.archivePageSize ?? 12;
        const result = await options.findMetaEntries(def.slug, {
          status: 'published',
          skip: 0,
          limit: pageSize,
          sort: def.display?.archiveSort ?? '-createdAt',
        });
        return {
          view: 'meta_archive',
          metaDefinition: def,
          metaEntries: result.items,
          pagination: { page, pageSize, total: result.total },
          slugSegments: segments,
        };
      }
    }

    const singleParams = matchPattern(singlePath, segments);
    if (singleParams?.handle) {
      const entry = await options.findMetaEntryByHandle(def.slug, singleParams.handle);
      if (entry) {
        return {
          view: 'meta_single',
          metaDefinition: def,
          metaEntry: entry,
          slugSegments: segments,
        };
      }
    }
  }

  const page = findPageByPath(options.pages, segments);
  if (page) {
    return { view: 'page', page, slugSegments: segments };
  }

  return { view: 'not_found', slugSegments: segments };
}

function findPageByPath(pages: RoutePage[], segments: string[]): RoutePage | undefined {
  if (segments.length === 0) return undefined;
  const targetSlug = segments[segments.length - 1]!;
  return pages.find((p) => p.slug === targetSlug && p.status === 'published');
}

export function metaObjectToLiquid(
  entry: RouteMetaEntry,
  definition?: RouteMetaDefinition,
): Record<string, unknown> {
  return {
    id: entry._id.toString(),
    handle: entry.handle,
    status: entry.status,
    locale: entry.locale,
    template_suffix: entry.templateSuffix,
    ...flattenEntryData(entry.data),
    seo: entry.data?.seo,
    metaobject_type: definition
      ? {
          slug: definition.slug,
          name: definition.name,
          singular_name: definition.singularName,
        }
      : undefined,
  };
}

function flattenEntryData(data: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    result[key] = value;
  }
  return result;
}

export function pageToLiquid(page: RoutePage): Record<string, unknown> {
  return {
    id: page._id.toString(),
    title: page.title,
    handle: page.handle,
    slug: page.slug,
    body: page.body,
    template_suffix: page.templateSuffix,
    seo: page.seo,
  };
}

export interface RouteMenuItem {
  label: string;
  url: string;
  type: string;
  items?: RouteMenuItem[];
}

export interface RouteMenu {
  title: string;
  handle: string;
  items: RouteMenuItem[];
}

function normalizePath(path: string): string {
  const normalized = path.replace(/\/+$/, '') || '/';
  return normalized.startsWith('/') ? normalized : `/${normalized}`;
}

function isPathActive(itemUrl: string, currentPath: string): boolean {
  const item = normalizePath(itemUrl);
  const current = normalizePath(currentPath);
  if (item === '/') return current === '/';
  return current === item || current.startsWith(`${item}/`);
}

function menuItemToLiquid(
  item: RouteMenuItem,
  currentPath: string,
): Record<string, unknown> {
  const childLinks = (item.items ?? []).map((child) => menuItemToLiquid(child, currentPath));
  const active = isPathActive(item.url, currentPath);
  const childActive = childLinks.some(
    (child) => child.active === true || child.child_active === true,
  );

  return {
    title: item.label,
    url: item.url,
    type: item.type,
    active,
    child_active: childActive,
    links: childLinks,
  };
}

export function menuToLiquid(menu: RouteMenu, currentPath: string): Record<string, unknown> {
  const links = (menu.items ?? []).map((item) => menuItemToLiquid(item, currentPath));
  return {
    title: menu.title,
    handle: menu.handle,
    links,
  };
}

export function menusToLinklists(
  menus: RouteMenu[],
  currentPath: string,
): Record<string, Record<string, unknown>> {
  const result: Record<string, Record<string, unknown>> = {};
  for (const menu of menus) {
    result[menu.handle] = menuToLiquid(menu, currentPath);
  }
  return result;
}

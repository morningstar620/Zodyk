import { DEFAULT_TENANT_ID } from '@zodyk/core';
import type { ThemeWorkspaceMetadata } from '@zodyk/theme-language';
import type { CrossFileReference } from '@zodyk/theme-language';

export interface TenantCatalog {
  pages: Array<{
    _id: { toString(): string };
    title: string;
    slug: string;
    templateSuffix?: string;
  }>;
  metaObjects: Array<{
    slug: string;
    name: string;
    singularName?: string;
    templates?: { templateKey?: string };
    routing?: { archivePath?: string; singlePath?: string; archiveEnabled?: boolean };
    fields?: Array<{ key: string; label: string; type: string; localized?: boolean }>;
  }>;
  menus: Array<{ handle: string; title: string }>;
  systemEntities: Array<{
    slug: string;
    name: string;
    singularLabel?: string;
    singularName?: string;
    fields?: Array<{ key: string; label: string; type: string; localized?: boolean }>;
    relationships?: Array<{ key: string; targetSlug: string; cardinality: string }>;
  }>;
}

export interface CachedWorkspaceMetadata {
  metadata: ThemeWorkspaceMetadata;
  crossFileRefs: CrossFileReference[];
  themeUpdatedAt: string;
}

const catalogCache = new Map<string, TenantCatalog>();
const workspaceMetadataCache = new Map<string, CachedWorkspaceMetadata>();

function workspaceCacheKey(tenantId: string, themeId: string, updatedAt: string): string {
  return `${tenantId}:${themeId}:${updatedAt}`;
}

export function getCachedCatalog(tenantId: string): TenantCatalog | undefined {
  return catalogCache.get(tenantId);
}

export function setCachedCatalog(tenantId: string, catalog: TenantCatalog): void {
  catalogCache.set(tenantId, catalog);
}

export function invalidateCatalogCache(tenantId = DEFAULT_TENANT_ID): void {
  catalogCache.delete(tenantId);
  for (const key of workspaceMetadataCache.keys()) {
    if (key.startsWith(`${tenantId}:`)) {
      workspaceMetadataCache.delete(key);
    }
  }
}

export function getCachedWorkspaceMetadata(
  tenantId: string,
  themeId: string,
  updatedAt: string,
): CachedWorkspaceMetadata | undefined {
  return workspaceMetadataCache.get(workspaceCacheKey(tenantId, themeId, updatedAt));
}

export function setCachedWorkspaceMetadata(
  tenantId: string,
  themeId: string,
  updatedAt: string,
  entry: CachedWorkspaceMetadata,
): void {
  workspaceMetadataCache.set(workspaceCacheKey(tenantId, themeId, updatedAt), entry);
}

export function invalidateWorkspaceMetadataCache(
  themeId: string,
  tenantId = DEFAULT_TENANT_ID,
): void {
  const prefix = `${tenantId}:${themeId}:`;
  for (const key of workspaceMetadataCache.keys()) {
    if (key.startsWith(prefix)) {
      workspaceMetadataCache.delete(key);
    }
  }
}

import { DEFAULT_TENANT_ID } from '@zodyk/core';
import { connectDatabase, getModels, getSystemEntityRepository } from '@zodyk/database';
import {
  getThemeHealth,
  getThemeSchemas,
  listSectionTypes,
  loadThemeById,
  type LoadedTheme,
  type ThemeLoadPhaseRecorder,
} from '@zodyk/theme-engine';
import {
  buildCrossFileIndex,
  flattenLocaleJson,
  resolveLanguageId,
  type CrossFileReference,
  type ThemeFile,
  type ThemeFileMeta,
  type ThemeWorkspaceMetadata,
  type ThemeWorkspaceSnapshot,
} from '@zodyk/theme-language';
import { createRequestTimings, formatServerTiming } from '../request-log';
import {
  getCachedCatalog,
  getCachedWorkspaceMetadata,
  setCachedCatalog,
  setCachedWorkspaceMetadata,
  type TenantCatalog,
} from './catalog-cache';

async function loadTenantCatalog(tenantId: string): Promise<TenantCatalog> {
  const cached = getCachedCatalog(tenantId);
  if (cached) return cached;

  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is required');
  await connectDatabase(uri);

  const { Page, MetaObjectDefinition, Menu } = getModels();
  const systemRepo = getSystemEntityRepository();

  const [pages, metaObjects, menus, systemEntities] = await Promise.all([
    Page.find({ tenantId, status: 'published' }).lean(),
    MetaObjectDefinition.find({ tenantId, status: 'active' }).lean(),
    Menu.find({ tenantId }).lean(),
    systemRepo.listDefinitions(tenantId),
  ]);

  const catalog = { pages, metaObjects, menus, systemEntities } as TenantCatalog;
  setCachedCatalog(tenantId, catalog);
  return catalog;
}

function buildFileMeta(path: string, version = 1): ThemeFileMeta {
  return { path, version, languageId: resolveLanguageId(path) };
}

function buildLocales(files: Record<string, string>): Record<string, string> {
  let locales: Record<string, string> = {};
  for (const [path, content] of Object.entries(files)) {
    if (path.startsWith('locales/') && path.endsWith('.json')) {
      try {
        const parsed = JSON.parse(content) as Record<string, unknown>;
        locales = { ...locales, ...flattenLocaleJson(parsed) };
      } catch {
        // ignore invalid locale files
      }
    }
  }
  return locales;
}

function mapHealthIssues(
  health: Awaited<ReturnType<typeof getThemeHealth>>,
): ThemeWorkspaceMetadata['healthIssues'] {
  return health.issues.map((issue) => ({
    code: issue.code,
    message: issue.message,
    severity: issue.severity,
    templateKey: issue.templateKey,
    sectionType: issue.sectionType,
  }));
}

function assembleWorkspaceData(
  theme: LoadedTheme,
  catalog: TenantCatalog,
  schemas: Awaited<ReturnType<typeof getThemeSchemas>>,
  healthIssues: ThemeWorkspaceMetadata['healthIssues'],
  crossFileRefs: CrossFileReference[],
) {
  const snippets = Object.keys(theme.files)
    .filter((p) => p.startsWith('snippets/') && p.endsWith('.liquid'))
    .map((p) => p.replace('snippets/', '').replace('.liquid', ''));

  const templates = Object.keys(theme.files).filter(
    (p) => p.startsWith('templates/') && p.endsWith('.json'),
  );

  const pageItems = [
    {
      id: 'home',
      label: 'Home page',
      templatePath: 'templates/index.json',
      pathname: '/',
      group: 'Pages',
    },
    {
      id: '404',
      label: '404',
      templatePath: 'templates/404.json',
      pathname: '/not-found',
      group: 'System',
    },
    ...catalog.pages.map((page) => ({
      id: page._id.toString(),
      label: page.title,
      templatePath: page.templateSuffix
        ? `templates/page.${page.templateSuffix}.json`
        : 'templates/page.json',
      pathname: `/${page.slug}`,
      group: 'Pages',
    })),
  ];

  const routes = [...pageItems.map((p) => ({
    pathname: p.pathname,
    templatePath: p.templatePath,
    viewType: p.id === 'home' ? 'home' : p.id === '404' ? 'not_found' : 'page',
  }))];

  for (const mo of catalog.metaObjects) {
    const key = mo.templates?.templateKey ?? mo.slug;
    const archivePath = mo.routing?.archivePath ?? `/${mo.slug}`;
    routes.push({
      pathname: archivePath,
      templatePath: `templates/${key}.archive.json`,
      viewType: 'meta_archive',
      metaObjectSlug: mo.slug,
    } as (typeof routes)[number] & { metaObjectSlug?: string });
    routes.push({
      pathname: `${archivePath}/:handle`,
      templatePath: `templates/${key}.single.json`,
      viewType: 'meta_single',
      metaObjectSlug: mo.slug,
    } as (typeof routes)[number] & { metaObjectSlug?: string });
  }

  const fileMetas: Record<string, ThemeFileMeta> = {};
  for (const path of Object.keys(theme.files)) {
    fileMetas[path] = buildFileMeta(path);
  }

  const shared = {
    themeId: theme.id,
    name: theme.name,
    status: theme.status,
    sectionSchemas: schemas.sectionSchemas as ThemeWorkspaceMetadata['sectionSchemas'],
    settingsSchema: schemas.settingsSchema as ThemeWorkspaceMetadata['settingsSchema'],
    settings: theme.settings,
    snippets,
    sectionTypes: listSectionTypes(theme.files),
    templates,
    metaObjects: catalog.metaObjects.map((mo) => ({
      slug: mo.slug,
      name: mo.name,
      singularName: mo.singularName,
      templateKey: mo.templates?.templateKey ?? mo.slug,
      archivePath: mo.routing?.archivePath,
      singlePath: mo.routing?.singlePath,
      archiveEnabled: mo.routing?.archiveEnabled ?? true,
      fields: (mo.fields ?? []).map((f) => ({
        key: f.key,
        label: f.label,
        type: f.type,
        localized: f.localized,
      })),
    })),
    systemEntities: catalog.systemEntities.map((entity) => ({
      slug: entity.slug,
      name: entity.name,
      singularLabel: entity.singularLabel ?? entity.singularName,
      fields: (entity.fields ?? []).map((f) => ({
        key: f.key,
        label: f.label,
        type: f.type,
        localized: f.localized,
      })),
      relationships: ((entity.relationships ?? []) as Array<{ key: string; targetSlug: string; cardinality: string }>).map((r) => ({
        name: r.key,
        targetSlug: r.targetSlug,
        type: r.cardinality,
      })),
    })),
    pages: pageItems,
    menus: catalog.menus.map((m) => ({ handle: m.handle, title: m.title })),
    routes: routes as ThemeWorkspaceMetadata['routes'],
    locales: buildLocales(theme.files),
    healthIssues,
    crossFileRefs,
  };

  return { fileMetas, shared };
}

async function buildWorkspaceMetadataUncached(
  themeId: string,
  tenantId: string,
  options?: { includeHealth?: boolean },
): Promise<{
  metadata: ThemeWorkspaceMetadata;
  crossFileRefs: CrossFileReference[];
  themeUpdatedAt: string;
  timings: Record<string, number>;
}> {
  const timings = createRequestTimings();
  const totalStart = performance.now();

  const themeLoadStart = performance.now();
  const themeLoadRecorder: ThemeLoadPhaseRecorder = {
    mark(phase, startMs) {
      timings.phases[phase] = performance.now() - startMs;
    },
    setMeta(key, value) {
      if (typeof value === 'number') timings.phases[key] = value;
    },
  };

  const theme = await loadThemeById(themeId, tenantId, themeLoadRecorder);
  if (!theme) throw new Error('Theme not found');
  timings.mark('theme-load', themeLoadStart);

  const themeUpdatedAt = theme.updatedAt ?? '';

  const catalogStart = performance.now();
  const catalog = await loadTenantCatalog(tenantId);
  timings.mark('catalog', catalogStart);

  const schemasStart = performance.now();
  const schemas = await getThemeSchemas(themeId, tenantId, { scope: 'all', theme });
  timings.mark('schemas', schemasStart);

  let healthIssues: ThemeWorkspaceMetadata['healthIssues'] = [];
  if (options?.includeHealth) {
    const healthStart = performance.now();
    const health = await getThemeHealth(themeId, tenantId, {
      files: theme.files,
      filePaths: Object.keys(theme.files),
      metaObjects: catalog.metaObjects,
    });
    healthIssues = mapHealthIssues(health);
    timings.mark('health', healthStart);
  }

  const indexStart = performance.now();
  const crossFileRefs = buildCrossFileIndex(theme.files);
  timings.mark('cross-file-index', indexStart);

  const assembleStart = performance.now();
  const { fileMetas, shared } = assembleWorkspaceData(
    theme,
    catalog,
    schemas,
    healthIssues,
    crossFileRefs,
  );

  const metadata: ThemeWorkspaceMetadata = {
    ...shared,
    files: fileMetas,
  };
  timings.mark('assemble', assembleStart);

  return {
    metadata,
    crossFileRefs,
    themeUpdatedAt,
    timings: timings.finish(totalStart),
  };
}

export async function buildThemeLanguageWorkspaceMetadata(
  themeId: string,
  tenantId = DEFAULT_TENANT_ID,
  options?: { includeHealth?: boolean },
): Promise<{ metadata: ThemeWorkspaceMetadata; timings: Record<string, number> }> {
  const themeProbe = await loadThemeById(themeId, tenantId);
  if (!themeProbe) throw new Error('Theme not found');
  const updatedAt = themeProbe.updatedAt ?? '';

  const cached = getCachedWorkspaceMetadata(tenantId, themeId, updatedAt);
  if (cached && !options?.includeHealth) {
    const timings = createRequestTimings();
    const totalStart = performance.now();
    timings.phases['workspace-cache-hit'] = 1;
    timings.finish(totalStart);
    return { metadata: cached.metadata, timings: timings.phases };
  }

  const built = await buildWorkspaceMetadataUncached(themeId, tenantId, options);

  if (!options?.includeHealth) {
    setCachedWorkspaceMetadata(tenantId, themeId, built.themeUpdatedAt, {
      metadata: built.metadata,
      crossFileRefs: built.crossFileRefs,
      themeUpdatedAt: built.themeUpdatedAt,
    });
  }

  return { metadata: built.metadata, timings: built.timings };
}

export async function buildThemeLanguageWorkspace(
  themeId: string,
  tenantId = DEFAULT_TENANT_ID,
  options?: { includeHealth?: boolean },
): Promise<{ snapshot: ThemeWorkspaceSnapshot; timings: Record<string, number> }> {
  const { metadata, timings } = await buildThemeLanguageWorkspaceMetadata(
    themeId,
    tenantId,
    options,
  );
  const theme = await loadThemeById(themeId, tenantId);
  if (!theme) throw new Error('Theme not found');

  const files: ThemeWorkspaceSnapshot['files'] = {};
  for (const [path, content] of Object.entries(theme.files)) {
    const meta = metadata.files[path];
    if (!meta) continue;
    files[path] = { ...meta, content };
  }

  return { snapshot: { ...metadata, files }, timings };
}

export async function buildThemeLanguageHealth(
  themeId: string,
  tenantId = DEFAULT_TENANT_ID,
): Promise<{ healthIssues: ThemeWorkspaceMetadata['healthIssues']; timings: Record<string, number> }> {
  const timings = createRequestTimings();
  const totalStart = performance.now();

  const themeLoadStart = performance.now();
  const theme = await loadThemeById(themeId, tenantId);
  if (!theme) throw new Error('Theme not found');
  timings.mark('theme-load', themeLoadStart);

  const catalogStart = performance.now();
  const catalog = await loadTenantCatalog(tenantId);
  timings.mark('catalog', catalogStart);

  const healthStart = performance.now();
  const health = await getThemeHealth(themeId, tenantId, {
    files: theme.files,
    filePaths: Object.keys(theme.files),
    metaObjects: catalog.metaObjects,
  });
  timings.mark('health', healthStart);

  return {
    healthIssues: mapHealthIssues(health),
    timings: timings.finish(totalStart),
  };
}

export function warmWorkspaceMetadataCache(
  themeId: string,
  tenantId = DEFAULT_TENANT_ID,
): void {
  void buildThemeLanguageWorkspaceMetadata(themeId, tenantId).catch(() => undefined);
}

export async function getThemeLanguageWorkspaceFiles(
  themeId: string,
  paths: string[],
  tenantId = DEFAULT_TENANT_ID,
): Promise<Record<string, ThemeFile>> {
  const theme = await loadThemeById(themeId, tenantId);
  if (!theme) throw new Error('Theme not found');

  const files: Record<string, ThemeFile> = {};
  for (const path of paths) {
    const content = theme.files[path];
    if (content !== undefined) {
      files[path] = {
        path,
        content,
        version: 1,
        languageId: resolveLanguageId(path),
      };
    }
  }
  return files;
}

export function buildWorkspaceTimingsHeader(timings: Record<string, number>): HeadersInit {
  return formatServerTiming(timings);
}

export { invalidateCatalogCache, invalidateWorkspaceMetadataCache } from './catalog-cache';

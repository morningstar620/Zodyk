import {
  DEFAULT_TENANT_ID,
  listPageTemplates,
  sectionInstanceSchema,
  templateCustomizationSchema,
  templateJsonSchema,
  z,
} from '@zodyk/core';
import { AuthError, requirePermission, type AuthSession } from '@zodyk/auth';
import { connectDatabase, getModels } from '@zodyk/database';
import {
  activateTheme,
  duplicateTheme,
  deleteTheme,
  deleteThemeFile,
  exportThemeAsZip,
  getTemplateCustomization,
  getTemplateJson,
  getThemeFile,
  getThemeHealth,
  getThemeMetadata,
  getThemeSchemas,
  getCustomizerBootstrap,
  installThemeFromDirectory,
  installThemeFromZip,
  listThemes,
  loadActiveTheme,
  loadThemeById,
  metaObjectToLiquid,
  pageToLiquid,
  publishTheme,
  renderThemePreview,
  renderThemeSection,
  resolveRoute,
  saveTemplateCustomization,
  saveTemplateJson,
  updateThemeSettingsForTheme,
  upsertThemeFile,
  type RenderContextInput,
} from '@zodyk/theme-engine';

const themeIdSchema = z.object({ themeId: z.string().min(1) });

const scaffoldTemplateSchema = z.object({
  themeId: z.string().min(1),
  templatePath: z.string().min(1),
  name: z.string().min(1),
  sectionType: z.string().optional(),
});

const fileWriteSchema = z.object({
  path: z.string().min(1),
  content: z.string(),
});

const uploadThemeSchema = z.object({
  name: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  version: z.string().optional(),
});

async function maybeInvalidateLiveTheme(isLive: boolean) {
  if (isLive) {
    await invalidateWebsiteCache();
  }
}

const previewSchema = z.object({
  pathname: z.string().default('/'),
  templatePath: z.string().optional(),
  templateJson: templateJsonSchema.optional(),
  themeSettings: z.record(z.unknown()).optional(),
  sectionOverrides: z.record(z.record(z.unknown())).optional(),
  pageTemplateSuffix: z.string().optional(),
  metaTemplateKey: z.string().optional(),
  metaEntryTemplateSuffix: z.string().optional(),
  view: z
    .enum(['home', 'page', 'meta_archive', 'meta_single', 'not_found'])
    .optional(),
});

function prepareCustomizerPreviewHtml(
  html: string,
  themeId: string,
  previewToken: string,
): string {
  const shopUrl = getShopUrl().replace(/\/$/, '');
  const assetQuery = `preview_theme=${encodeURIComponent(themeId)}&preview_token=${encodeURIComponent(previewToken)}`;
  let result = html.replace(/\/assets\/([a-zA-Z0-9._-]+)/g, `/assets/$1?${assetQuery}`);
  const baseTag = `<base href="${shopUrl}/">`;
  if (result.includes('<head>')) {
    result = result.replace('<head>', `<head>${baseTag}`);
  } else {
    result = `${baseTag}${result}`;
  }
  const designScript = '<script src="/zodyk-design-mode.js"></script>';
  if (!result.includes('zodyk-design-mode.js')) {
    result = result.includes('</body>')
      ? result.replace('</body>', `${designScript}</body>`)
      : `${result}${designScript}`;
  }
  return result;
}

const sectionRenderSchema = z.object({
  sectionId: z.string().min(1),
  instance: sectionInstanceSchema,
  pathname: z.string().default('/'),
  themeSettings: z.record(z.unknown()).optional(),
});

const PREVIEW_CONTEXT_TTL_MS = 30_000;
const previewContextCache = new Map<
  string,
  {
    cachedAt: number;
    built: Awaited<ReturnType<typeof buildPreviewContextUncached>>;
  }
>();

function formatServerTiming(timings: Record<string, number>): HeadersInit {
  return {
    'Server-Timing': Object.entries(timings)
      .map(([name, dur]) => `${name};dur=${Math.round(dur)}`)
      .join(', '),
  };
}

function getShopUrl(): string {
  return process.env.WEBSITE_URL ?? process.env.ADMIN_URL ?? 'http://localhost:3001';
}

async function buildPreviewContextUncached(
  pathname: string,
  themeSettings?: Record<string, unknown>,
) {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is required');
  await connectDatabase(uri);
  const { Page, MetaObjectDefinition, MetaObjectEntry } = getModels();

  const [pages, metaDefinitions] = await Promise.all([
    Page.find({ tenantId: DEFAULT_TENANT_ID, status: 'published' }).lean(),
    MetaObjectDefinition.find({ tenantId: DEFAULT_TENANT_ID, status: 'active' }).lean(),
  ]);

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

  const theme = themeSettings ? null : await loadActiveTheme(DEFAULT_TENANT_ID);
  const shopUrl = getShopUrl();
  const settings = themeSettings ?? theme?.settings ?? {};

  return {
    route,
    context: {
      shop: {
        name: String(settings.site_name ?? 'Zodyk'),
        url: shopUrl,
        currency: 'USD',
      },
      request: { path: pathname, locale: 'en' },
      settings,
      page:
        route.view === 'home' || route.view === 'page'
          ? pageToLiquid(
              route.page ??
                ({
                  _id: { toString: () => 'home' },
                  title: 'Home',
                  handle: 'home',
                  slug: 'home',
                  status: 'published',
                } as const),
            )
          : undefined,
      metaobject:
        route.metaEntry && route.metaDefinition
          ? metaObjectToLiquid(route.metaEntry, route.metaDefinition)
          : undefined,
      metaobjects:
        route.metaEntries && route.metaDefinition
          ? route.metaEntries.map((e) => metaObjectToLiquid(e, route.metaDefinition!))
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
    },
    pageTemplateSuffix: route.page?.templateSuffix,
    metaTemplateKey: route.metaDefinition?.templates?.templateKey ?? route.metaDefinition?.slug,
    metaEntryTemplateSuffix: route.metaEntry?.templateSuffix,
    view: route.view,
  };
}

async function buildPreviewContext(
  pathname: string,
  themeSettings?: Record<string, unknown>,
) {
  const cacheKey = pathname;
  const cached = previewContextCache.get(cacheKey);
  if (cached && Date.now() - cached.cachedAt < PREVIEW_CONTEXT_TTL_MS) {
    const built = cached.built;
    if (themeSettings) {
      return {
        ...built,
        context: {
          ...built.context,
          settings: themeSettings,
          shop: {
            ...built.context.shop,
            name: String(themeSettings.site_name ?? built.context.shop.name),
          },
        },
      };
    }
    return built;
  }

  const built = await buildPreviewContextUncached(pathname, themeSettings);
  previewContextCache.set(cacheKey, { cachedAt: Date.now(), built });
  return built;
}

export async function listThemesHandler(session: AuthSession | null) {
  requirePermission(session, 'themes:read');
  return listThemes(DEFAULT_TENANT_ID);
}

export async function getThemeHandler(session: AuthSession | null, themeId: string) {
  requirePermission(session, 'themes:read');
  const meta = await getThemeMetadata(themeId, DEFAULT_TENANT_ID);
  if (!meta) throw new AuthError('Theme not found', 404);
  return meta;
}

export async function getActiveThemeHandler(session: AuthSession | null) {
  requirePermission(session, 'themes:read');
  const theme = await loadActiveTheme(DEFAULT_TENANT_ID);
  if (!theme) return null;
  return {
    id: theme.id,
    name: theme.name,
    slug: theme.slug,
    version: theme.version,
    status: theme.status,
    previewToken: theme.previewToken,
    settings: theme.settings,
    templateFiles: Object.keys(theme.files).filter((f) => f.startsWith('templates/')),
    pageTemplates: listPageTemplates(Object.keys(theme.files)),
  };
}

export async function activateThemeHandler(session: AuthSession | null, body: unknown) {
  requirePermission(session, 'themes:activate');
  const input = themeIdSchema.parse(body);
  await activateTheme(input.themeId, DEFAULT_TENANT_ID);
  return { success: true };
}

async function invalidateWebsiteCache() {
  const websiteUrl = process.env.WEBSITE_URL ?? 'http://localhost:3001';
  try {
    await fetch(`${websiteUrl}/api/revalidate`, { method: 'POST' });
  } catch {
    /* website may be offline during admin save */
  }
}

export async function publishThemeHandler(session: AuthSession | null, body: unknown) {
  requirePermission(session, 'themes:publish');
  const input = themeIdSchema.parse(body);
  await publishTheme(input.themeId, DEFAULT_TENANT_ID);
  await invalidateWebsiteCache();
  return { success: true };
}

export async function duplicateThemeHandler(session: AuthSession | null, body: unknown) {
  requirePermission(session, 'themes:update');
  const input = themeIdSchema.parse(body);
  return duplicateTheme(input.themeId, DEFAULT_TENANT_ID);
}

export async function deleteThemeHandler(session: AuthSession | null, themeId: string) {
  requirePermission(session, 'themes:delete');
  try {
    await deleteTheme(themeId, DEFAULT_TENANT_ID);
  } catch (error) {
    if (error instanceof Error) {
      throw new AuthError(error.message, 403);
    }
    throw error;
  }
  return { success: true };
}

export async function getThemeHealthHandler(
  session: AuthSession | null,
  themeId?: string,
) {
  requirePermission(session, 'themes:read');
  return getThemeHealth(themeId, DEFAULT_TENANT_ID);
}

export async function scaffoldTemplateHandler(session: AuthSession | null, body: unknown) {
  requirePermission(session, 'themes:update');
  const input = scaffoldTemplateSchema.parse(body);
  const result = await upsertThemeFile(
    input.themeId,
    input.templatePath,
    JSON.stringify(
      {
        name: input.name,
        sections: {
          main_1: {
            type: input.sectionType ?? (input.templatePath.includes('archive') ? 'main-archive' : 'main-single'),
            settings: {},
          },
        },
        order: ['main_1'],
      },
      null,
      2,
    ),
    DEFAULT_TENANT_ID,
  );
  await maybeInvalidateLiveTheme(result.isLive);
  return { success: true };
}

export async function installDefaultThemeHandler(session: AuthSession | null, dir: string) {
  requirePermission(session, 'themes:install');
  const result = await installThemeFromDirectory(dir, {
    name: 'Zodyk Starter',
    slug: 'zodyk-starter',
    version: '1.0.0',
    activate: true,
    tenantId: DEFAULT_TENANT_ID,
  });
  return result;
}

export async function listThemeTemplates(session: AuthSession | null, themeId?: string) {
  requirePermission(session, 'themes:read');
  const theme = themeId
    ? await loadThemeById(themeId, DEFAULT_TENANT_ID)
    : await loadActiveTheme(DEFAULT_TENANT_ID);
  if (!theme) throw new AuthError('Theme not found', 404);
  return {
    pageTemplates: listPageTemplates(Object.keys(theme.files)),
    templateFiles: Object.keys(theme.files).filter((f) => f.startsWith('templates/')),
  };
}

export async function getThemeFileHandler(
  session: AuthSession | null,
  themeId: string,
  path: string,
) {
  requirePermission(session, 'themes:read');
  const file = await getThemeFile(themeId, path, DEFAULT_TENANT_ID);
  if (!file) throw new AuthError('File not found', 404);
  return file;
}

export async function putThemeFileHandler(
  session: AuthSession | null,
  themeId: string,
  body: unknown,
) {
  requirePermission(session, 'themes:update');
  const input = fileWriteSchema.parse(body);
  const result = await upsertThemeFile(themeId, input.path, input.content, DEFAULT_TENANT_ID);
  await maybeInvalidateLiveTheme(result.isLive);
  return { success: true };
}

export async function createThemeFileHandler(
  session: AuthSession | null,
  themeId: string,
  body: unknown,
) {
  requirePermission(session, 'themes:update');
  const input = fileWriteSchema.parse(body);
  const existing = await getThemeFile(themeId, input.path, DEFAULT_TENANT_ID);
  if (existing) throw new AuthError('File already exists', 409);
  const result = await upsertThemeFile(themeId, input.path, input.content, DEFAULT_TENANT_ID);
  await maybeInvalidateLiveTheme(result.isLive);
  return { success: true };
}

export async function deleteThemeFileHandler(
  session: AuthSession | null,
  themeId: string,
  path: string,
) {
  requirePermission(session, 'themes:update');
  const result = await deleteThemeFile(themeId, path, DEFAULT_TENANT_ID);
  await maybeInvalidateLiveTheme(result.isLive);
  return { success: true };
}

export async function uploadThemeHandler(session: AuthSession | null, formData: FormData) {
  requirePermission(session, 'themes:install');
  const file = formData.get('file');
  if (!(file instanceof File)) {
    throw new AuthError('Theme zip file is required', 400);
  }

  const meta = uploadThemeSchema.parse({
    name: formData.get('name') ?? undefined,
    slug: formData.get('slug') ?? undefined,
    version: formData.get('version') ?? undefined,
  });

  const baseName = meta.name ?? (file.name.replace(/\.zip$/i, '') || 'Imported Theme');
  const slug =
    meta.slug ??
    baseName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 60) + `-${Date.now().toString(36)}`;

  const buffer = Buffer.from(await file.arrayBuffer());
  const result = await installThemeFromZip(buffer, {
    name: baseName,
    slug,
    version: meta.version ?? '1.0.0',
    tenantId: DEFAULT_TENANT_ID,
  });

  return result;
}

export async function exportThemeHandler(session: AuthSession | null, themeId: string) {
  requirePermission(session, 'themes:read');
  return exportThemeAsZip(themeId, DEFAULT_TENANT_ID);
}

export async function getThemeSchemasHandler(
  session: AuthSession | null,
  themeId: string,
  options?: { scope?: 'all' | 'template'; sectionTypes?: string[] },
) {
  requirePermission(session, 'themes:read');
  return getThemeSchemas(themeId, DEFAULT_TENANT_ID, options);
}

export async function getCustomizerBootstrapHandler(
  session: AuthSession | null,
  themeId: string,
  options?: { pathname?: string },
) {
  requirePermission(session, 'themes:read');
  return getCustomizerBootstrap(themeId, DEFAULT_TENANT_ID, options);
}

export async function getThemeTemplateHandler(
  session: AuthSession | null,
  themeId: string,
  templatePath: string,
) {
  requirePermission(session, 'themes:read');
  const template = await getTemplateJson(themeId, templatePath, DEFAULT_TENANT_ID);
  if (!template) throw new AuthError('Template not found', 404);
  return template;
}

export async function putThemeTemplateHandler(
  session: AuthSession | null,
  themeId: string,
  templatePath: string,
  body: unknown,
) {
  requirePermission(session, 'themes:update');
  const template = await saveTemplateJson(
    themeId,
    templatePath,
    templateJsonSchema.parse(body),
    DEFAULT_TENANT_ID,
  );
  const meta = await getThemeMetadata(themeId, DEFAULT_TENANT_ID);
  if (meta?.status === 'live') {
    await invalidateWebsiteCache();
  }
  return template;
}

export async function getThemeCustomizationHandler(
  session: AuthSession | null,
  themeId: string,
  resourceType: string,
  resourceId: string,
) {
  requirePermission(session, 'themes:read');
  const rt = resourceType === 'page' || resourceType === 'meta_entry' ? resourceType : null;
  if (!rt) throw new AuthError('Invalid resource type', 400);
  return (
    (await getTemplateCustomization(rt, resourceId, themeId, DEFAULT_TENANT_ID)) ?? {
      sectionOverrides: {},
    }
  );
}

export async function putThemeCustomizationHandler(
  session: AuthSession | null,
  themeId: string,
  body: unknown,
) {
  requirePermission(session, 'themes:update');
  const input = templateCustomizationSchema.parse(body);
  return saveTemplateCustomization(
    {
      themeId,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      templateKey: input.templateKey,
      sectionOverrides: input.sectionOverrides,
    },
    DEFAULT_TENANT_ID,
  );
}

export async function previewThemeHandler(
  session: AuthSession | null,
  themeId: string,
  body: unknown,
) {
  requirePermission(session, 'themes:read');
  const timings: Record<string, number> = {};
  const totalStart = performance.now();

  const input = previewSchema.parse(body);

  const contextStart = performance.now();
  const built = await buildPreviewContext(input.pathname, input.themeSettings);
  timings['context'] = performance.now() - contextStart;

  const themeLoadStart = performance.now();
  const theme = await loadThemeById(themeId, DEFAULT_TENANT_ID);
  timings['theme-load'] = performance.now() - themeLoadStart;
  if (!theme) throw new AuthError('Theme not found', 404);

  const settings = input.themeSettings ?? theme.settings;

  const renderStart = performance.now();
  const result = await renderThemePreview(
    themeId,
    {
      pathname: input.pathname,
      templatePath: input.templatePath,
      templateJson: input.templateJson,
      sectionOverrides: input.sectionOverrides,
      view: input.view ?? built.view,
      pageTemplateSuffix: input.pageTemplateSuffix ?? built.pageTemplateSuffix,
      metaTemplateKey: input.metaTemplateKey ?? built.metaTemplateKey,
      metaEntryTemplateSuffix: input.metaEntryTemplateSuffix ?? built.metaEntryTemplateSuffix,
      context: { ...built.context, settings } as RenderContextInput,
    },
    DEFAULT_TENANT_ID,
  );
  timings['liquid-render'] = performance.now() - renderStart;
  timings.total = performance.now() - totalStart;

  if (timings.total > 500 && process.env.NODE_ENV !== 'production') {
    console.warn(`[preview] slow render ${Math.round(timings.total)}ms`, timings);
  }

  return {
    result: {
      ...result,
      html: prepareCustomizerPreviewHtml(result.html, themeId, theme.previewToken),
    },
    serverTiming: formatServerTiming(timings),
  };
}

export async function renderThemeSectionHandler(
  session: AuthSession | null,
  themeId: string,
  body: unknown,
) {
  requirePermission(session, 'themes:read');
  const timings: Record<string, number> = {};
  const totalStart = performance.now();

  const input = sectionRenderSchema.parse(body);

  const contextStart = performance.now();
  const built = await buildPreviewContext(input.pathname, input.themeSettings);
  timings.context = performance.now() - contextStart;

  const themeLoadStart = performance.now();
  const theme = await loadThemeById(themeId, DEFAULT_TENANT_ID);
  timings['theme-load'] = performance.now() - themeLoadStart;
  if (!theme) throw new AuthError('Theme not found', 404);

  const settings = input.themeSettings ?? theme.settings;

  const renderStart = performance.now();
  const html = await renderThemeSection(
    themeId,
    {
      sectionId: input.sectionId,
      instance: input.instance,
      context: { ...built.context, settings } as RenderContextInput,
    },
    DEFAULT_TENANT_ID,
  );
  timings['liquid-render'] = performance.now() - renderStart;
  timings.total = performance.now() - totalStart;

  if (timings.total > 500 && process.env.NODE_ENV !== 'production') {
    console.warn(`[section-render] slow render ${Math.round(timings.total)}ms`, timings);
  }

  return {
    result: { html },
    serverTiming: formatServerTiming(timings),
  };
}

export async function updateThemeSettings(session: AuthSession | null, body: unknown) {
  requirePermission(session, 'themes:update');
  const values = z.record(z.unknown()).parse(body);
  const theme = await loadActiveTheme(DEFAULT_TENANT_ID);
  if (!theme) throw new AuthError('No active theme', 404);
  const { settings, isLive } = await updateThemeSettingsForTheme(theme.id, values, DEFAULT_TENANT_ID);
  await maybeInvalidateLiveTheme(isLive);
  return { success: true, settings };
}

export async function updateThemeSettingsById(
  session: AuthSession | null,
  themeId: string,
  body: unknown,
) {
  requirePermission(session, 'themes:update');
  const values = z.record(z.unknown()).parse(body);
  const { settings, isLive } = await updateThemeSettingsForTheme(themeId, values, DEFAULT_TENANT_ID);
  await maybeInvalidateLiveTheme(isLive);
  return { success: true, settings };
}

export async function listThemePagesHandler(session: AuthSession | null) {
  requirePermission(session, 'themes:read');
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is required');
  await connectDatabase(uri);
  const { Page, MetaObjectDefinition } = getModels();

  const [pages, metaObjects, theme] = await Promise.all([
    Page.find({ tenantId: DEFAULT_TENANT_ID, status: 'published' }).lean(),
    MetaObjectDefinition.find({ tenantId: DEFAULT_TENANT_ID, status: 'active' }).lean(),
    loadActiveTheme(DEFAULT_TENANT_ID),
  ]);

  const templateFiles = theme ? Object.keys(theme.files).filter((f) => f.startsWith('templates/')) : [];

  const items: Array<{
    id: string;
    label: string;
    templatePath: string;
    pathname: string;
    group: string;
  }> = [
    { id: 'home', label: 'Home page', templatePath: 'templates/index.json', pathname: '/', group: 'Pages' },
    { id: '404', label: '404', templatePath: 'templates/404.json', pathname: '/not-found', group: 'System' },
  ];

  for (const page of pages) {
    const suffix = page.templateSuffix;
    const templatePath = suffix ? `templates/page.${suffix}.json` : 'templates/page.json';
    items.push({
      id: page._id.toString(),
      label: page.title,
      templatePath,
      pathname: `/${page.slug}`,
      group: 'Pages',
    });
  }

  for (const mo of metaObjects) {
    const key = mo.templates?.templateKey ?? mo.slug;
    const archivePath = mo.routing?.archivePath ?? `/${mo.slug}`;
    items.push({
      id: `${mo.slug}-archive`,
      label: `${mo.name} archive`,
      templatePath: `templates/${key}.archive.json`,
      pathname: archivePath,
      group: 'Meta objects',
    });
    items.push({
      id: `${mo.slug}-single`,
      label: `${mo.singularName ?? mo.name} single`,
      templatePath: `templates/${key}.single.json`,
      pathname: archivePath,
      group: 'Meta objects',
    });
  }

  return { items, templateFiles };
}

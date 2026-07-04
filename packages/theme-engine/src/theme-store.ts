import {
  DEFAULT_TENANT_ID,
  auditThemeHealth,
  templateJsonSchema,
  themeSettingsSchemaSchema,
  type TemplateJson,
  type ThemeHealthIssue,
} from '@zodyk/core';
import { connectDatabase, getModels } from '@zodyk/database';
import { requireStorageConfig } from '@zodyk/media';
import type { Types } from 'mongoose';
import { randomBytes } from 'node:crypto';
import { checksum, filesToMap, readThemeDirectory } from './install';
import {
  PROTECTED_THEME_PATHS,
  deleteThemeObject,
  deleteThemePrefix,
  ensureThemeStoragePrefix,
  guessContentType,
  readThemeObjectContent,
  themeStoragePrefix,
  writeThemeObject,
} from './r2-storage';
import {
  listSectionTypes,
  loadThemeSettings,
  parseAllSectionSchemas,
  parseSectionSchemasForTypes,
  getSectionTypesFromTemplate,
  renderThemedPage,
} from './renderer';
import type { RenderContextInput } from './renderer';
import { createLiquidEngine, renderSection } from '@zodyk/liquid';
import { buildThemeZip, buildThemeZipFilename, extractThemeZip, type ThemeZipFile } from './zip';

export interface LoadedTheme {
  id: string;
  name: string;
  slug: string;
  version: string;
  status: 'live' | 'draft' | 'archived';
  previewToken: string;
  files: Record<string, string>;
  settings: Record<string, unknown>;
}

export interface ThemeListItem {
  id: string;
  name: string;
  slug: string;
  version: string;
  status: 'live' | 'draft' | 'archived';
  isActive: boolean;
  sourceThemeId?: string;
  previewToken: string;
  publishedAt?: Date;
  lastSavedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const THEME_CACHE_TTL_MS = 60_000;
const themeCache = new Map<string, { theme: LoadedTheme; cachedAt: number }>();

function themeCacheKey(themeId: string, tenantId: string, updatedAt: string): string {
  return `${tenantId}:${themeId}:${updatedAt}`;
}

export function invalidateThemeCache(themeId: string, tenantId = DEFAULT_TENANT_ID): void {
  const prefix = `${tenantId}:${themeId}:`;
  for (const key of themeCache.keys()) {
    if (key.startsWith(prefix)) themeCache.delete(key);
  }
}

async function ensureDb() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is required');
  await connectDatabase(uri);
  await requireStorageConfig();
  return getModels();
}

export async function assertOneLiveTheme(tenantId = DEFAULT_TENANT_ID): Promise<void> {
  const { Theme } = await ensureDb();
  const liveCount = await Theme.countDocuments({ tenantId, status: 'live' });
  if (liveCount !== 1) {
    throw new Error(`Expected exactly one live theme, found ${liveCount}`);
  }
}

async function loadThemeFiles(themeId: Types.ObjectId | string): Promise<Record<string, string>> {
  const { ThemeFile } = await ensureDb();
  const themeFiles = await ThemeFile.find({ themeId }).lean();
  const entries = await Promise.all(
    themeFiles.map(async (f) => {
      const content = await readThemeObjectContent(f.r2Key, f.content);
      return { path: f.path, content };
    }),
  );
  return filesToMap(entries);
}

function toLoadedTheme(
  theme: {
    _id: Types.ObjectId;
    name: string;
    slug: string;
    version: string;
    status: 'live' | 'draft' | 'archived';
    previewToken: string;
  },
  files: Record<string, string>,
): LoadedTheme {
  return {
    id: theme._id.toString(),
    name: theme.name,
    slug: theme.slug,
    version: theme.version,
    status: theme.status,
    previewToken: theme.previewToken,
    files,
    settings: loadThemeSettings(files),
  };
}

async function installThemeFiles(
  theme: {
    _id: Types.ObjectId;
    tenantId: string;
    storagePrefix?: string;
  },
  files: ThemeZipFile[],
): Promise<void> {
  const { Theme, ThemeFile } = await ensureDb();
  const tenantId = theme.tenantId;
  const themeId = theme._id.toString();
  const prefix = themeStoragePrefix(tenantId, themeId);

  if (!theme.storagePrefix) {
    await Theme.updateOne({ _id: theme._id }, { storagePrefix: prefix });
  }

  const existing = await ThemeFile.find({ themeId: theme._id }).lean();
  if (existing.length > 0) {
    const oldPrefix = ensureThemeStoragePrefix(theme);
    await deleteThemePrefix(oldPrefix);
    await ThemeFile.deleteMany({ themeId: theme._id });
  }

  const rows = [];
  for (const file of files) {
    const stored = await writeThemeObject(tenantId, themeId, file.path, file.content);
    rows.push({
      themeId: theme._id,
      path: file.path,
      r2Key: stored.r2Key,
      size: stored.size,
      checksum: stored.checksum,
      contentType: stored.contentType,
    });
  }

  if (rows.length > 0) {
    await ThemeFile.insertMany(rows);
  }
}

export async function loadThemeById(
  themeId: string,
  tenantId = DEFAULT_TENANT_ID,
): Promise<LoadedTheme | null> {
  const { Theme } = await ensureDb();
  const theme = await Theme.findOne({ _id: themeId, tenantId }).lean();
  if (!theme) return null;

  const updatedAt = theme.updatedAt?.toISOString() ?? '';
  const cacheKey = themeCacheKey(themeId, tenantId, updatedAt);
  const cached = themeCache.get(cacheKey);
  if (cached && Date.now() - cached.cachedAt < THEME_CACHE_TTL_MS) {
    return cached.theme;
  }

  const files = await loadThemeFiles(theme._id);
  const loaded = toLoadedTheme(theme, files);
  themeCache.set(cacheKey, { theme: loaded, cachedAt: Date.now() });
  return loaded;
}

export async function loadActiveTheme(tenantId = DEFAULT_TENANT_ID): Promise<LoadedTheme | null> {
  const { Theme } = await ensureDb();
  const theme = await Theme.findOne({
    tenantId,
    $or: [{ status: 'live' }, { isActive: true }],
  }).lean();
  if (!theme) return null;
  const files = await loadThemeFiles(theme._id);
  return toLoadedTheme(theme, files);
}

export async function loadThemeByPreview(
  themeId: string,
  previewToken: string,
  tenantId = DEFAULT_TENANT_ID,
): Promise<LoadedTheme | null> {
  const { Theme } = await ensureDb();
  const theme = await Theme.findOne({ _id: themeId, tenantId, previewToken }).lean();
  if (!theme) return null;
  const files = await loadThemeFiles(theme._id);
  return toLoadedTheme(theme, files);
}

export async function installThemeFromDirectory(
  dir: string,
  options: { name: string; slug: string; version?: string; activate?: boolean; tenantId?: string },
): Promise<{ themeId: string }> {
  const { Theme } = await ensureDb();
  const tenantId = options.tenantId ?? DEFAULT_TENANT_ID;
  const files = await readThemeDirectory(dir);

  let theme = await Theme.findOne({ tenantId, slug: options.slug });
  if (!theme) {
    theme = await Theme.create({
      name: options.name,
      slug: options.slug,
      version: options.version ?? '1.0.0',
      status: options.activate ? 'live' : 'draft',
      isActive: Boolean(options.activate),
      tenantId,
      storagePrefix: '',
      previewToken: randomBytes(24).toString('hex'),
      publishedAt: options.activate ? new Date() : undefined,
      lastSavedAt: new Date(),
    });
  } else {
    theme.version = options.version ?? theme.version;
    await theme.save();
  }

  await installThemeFiles(theme, files);

  if (options.activate) {
    await Theme.updateMany(
      { tenantId, _id: { $ne: theme._id } },
      { status: 'archived', isActive: false },
    );
    theme.status = 'live';
    theme.isActive = true;
    theme.publishedAt = new Date();
    await theme.save();
  }

  await assertOneLiveTheme(tenantId);
  return { themeId: theme._id.toString() };
}

export async function installThemeFromZip(
  buffer: Buffer,
  options: { name: string; slug: string; version?: string; tenantId?: string },
): Promise<{ themeId: string }> {
  const { Theme } = await ensureDb();
  const tenantId = options.tenantId ?? DEFAULT_TENANT_ID;
  const files = await extractThemeZip(buffer);

  const theme = await Theme.create({
    name: options.name,
    slug: options.slug,
    version: options.version ?? '1.0.0',
    status: 'draft',
    isActive: false,
    tenantId,
    storagePrefix: '',
    previewToken: randomBytes(24).toString('hex'),
    lastSavedAt: new Date(),
  });

  await installThemeFiles(theme, files);
  return { themeId: theme._id.toString() };
}

export async function exportThemeAsZip(
  themeId: string,
  tenantId = DEFAULT_TENANT_ID,
): Promise<{ buffer: Buffer; filename: string; name: string }> {
  const { Theme } = await ensureDb();
  const theme = await Theme.findOne({ _id: themeId, tenantId }).lean();
  if (!theme) throw new Error('Theme not found');

  const files = await loadThemeFiles(theme._id);
  const entries = Object.entries(files).map(([path, content]) => ({ path, content }));
  const buffer = await buildThemeZip(entries);
  return {
    buffer,
    filename: buildThemeZipFilename(theme.name),
    name: theme.name,
  };
}

export async function activateTheme(themeId: string, tenantId = DEFAULT_TENANT_ID): Promise<void> {
  await publishTheme(themeId, tenantId);
}

export async function publishTheme(themeId: string, tenantId = DEFAULT_TENANT_ID): Promise<void> {
  const { Theme } = await ensureDb();
  const draft = await Theme.findOne({ _id: themeId, tenantId });
  if (!draft) throw new Error('Theme not found');
  if (draft.status === 'live') return;

  await Theme.updateMany({ tenantId, status: 'live' }, { status: 'archived', isActive: false });

  draft.status = 'live';
  draft.isActive = true;
  draft.publishedAt = new Date();
  await draft.save();
  await assertOneLiveTheme(tenantId);
}

export async function duplicateTheme(
  themeId: string,
  tenantId = DEFAULT_TENANT_ID,
): Promise<{ themeId: string }> {
  const { Theme } = await ensureDb();
  const source = await Theme.findOne({ _id: themeId, tenantId });
  if (!source) throw new Error('Theme not found');
  const suffix = Date.now().toString(36);
  const newSlug = `${source.slug}-copy-${suffix}`;

  const copy = await Theme.create({
    name: `${source.name} (Copy)`,
    slug: newSlug,
    version: source.version,
    status: 'draft',
    isActive: false,
    tenantId,
    sourceThemeId: source._id,
    previewToken: randomBytes(24).toString('hex'),
    lastSavedAt: new Date(),
  });

  const filesMap = await loadThemeFiles(source._id);
  const zipFiles = Object.entries(filesMap).map(([path, content]) => ({
    path,
    content,
    contentType: guessContentType(path),
  }));
  await installThemeFiles(copy, zipFiles);

  return { themeId: copy._id.toString() };
}

export async function deleteTheme(themeId: string, tenantId = DEFAULT_TENANT_ID): Promise<void> {
  const { Theme, ThemeFile } = await ensureDb();
  const theme = await Theme.findOne({ _id: themeId, tenantId });
  if (!theme) throw new Error('Theme not found');
  if (theme.status === 'live') throw new Error('Cannot delete the live theme');

  const themeCount = await Theme.countDocuments({ tenantId });
  if (themeCount <= 1) {
    throw new Error('Cannot delete the only theme');
  }

  const prefix = ensureThemeStoragePrefix(theme);
  await deleteThemePrefix(prefix);
  await ThemeFile.deleteMany({ themeId: theme._id });
  await Theme.deleteOne({ _id: theme._id });
  await assertOneLiveTheme(tenantId);
}

export async function listThemes(tenantId = DEFAULT_TENANT_ID): Promise<ThemeListItem[]> {
  const { Theme } = await ensureDb();
  const items = await Theme.find({ tenantId }).sort({ status: 1, name: 1 }).lean();
  return items.map((t) => ({
    id: t._id.toString(),
    name: t.name,
    slug: t.slug,
    version: t.version,
    status: t.status ?? (t.isActive ? 'live' : 'draft'),
    isActive: t.isActive,
    sourceThemeId: t.sourceThemeId?.toString(),
    previewToken: t.previewToken,
    publishedAt: t.publishedAt,
    lastSavedAt: t.lastSavedAt,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  }));
}

export async function getThemeMetadata(themeId: string, tenantId = DEFAULT_TENANT_ID) {
  const { Theme, ThemeFile } = await ensureDb();
  const theme = await Theme.findOne({ _id: themeId, tenantId }).lean();
  if (!theme) return null;

  const filePaths = await ThemeFile.find({ themeId: theme._id }).distinct('path');
  return {
    id: theme._id.toString(),
    name: theme.name,
    slug: theme.slug,
    version: theme.version,
    status: theme.status ?? (theme.isActive ? 'live' : 'draft'),
    isActive: theme.isActive,
    previewToken: theme.previewToken,
    sourceThemeId: theme.sourceThemeId?.toString(),
    publishedAt: theme.publishedAt,
    lastSavedAt: theme.lastSavedAt,
    createdAt: theme.createdAt,
    updatedAt: theme.updatedAt,
    files: filePaths.sort(),
  };
}

export async function listThemeFiles(themeId: string, tenantId = DEFAULT_TENANT_ID) {
  const theme = await getThemeMetadata(themeId, tenantId);
  if (!theme) throw new Error('Theme not found');
  return theme.files;
}

export async function getThemeFile(
  themeId: string,
  path: string,
  tenantId = DEFAULT_TENANT_ID,
): Promise<{ path: string; content: string; contentType: string } | null> {
  const { Theme, ThemeFile } = await ensureDb();
  const theme = await Theme.findOne({ _id: themeId, tenantId }).lean();
  if (!theme) return null;

  const file = await ThemeFile.findOne({ themeId: theme._id, path }).lean();
  if (!file) return null;

  const content = await readThemeObjectContent(file.r2Key, file.content);
  return { path: file.path, content, contentType: file.contentType };
}

export async function upsertThemeFile(
  themeId: string,
  path: string,
  content: string,
  tenantId = DEFAULT_TENANT_ID,
): Promise<{ isLive: boolean }> {
  const { Theme, ThemeFile } = await ensureDb();
  const theme = await Theme.findOne({ _id: themeId, tenantId });
  if (!theme) throw new Error('Theme not found');

  const stored = await writeThemeObject(tenantId, themeId, path, content);

  if (!theme.storagePrefix) {
    theme.storagePrefix = themeStoragePrefix(tenantId, themeId);
  }

  await ThemeFile.findOneAndUpdate(
    { themeId: theme._id, path },
    {
      $set: {
        themeId: theme._id,
        path,
        r2Key: stored.r2Key,
        size: stored.size,
        checksum: stored.checksum,
        contentType: stored.contentType,
      },
      $unset: { content: '' },
    },
    { upsert: true, new: true },
  );

  theme.lastSavedAt = new Date();
  await theme.save();
  invalidateThemeCache(themeId, tenantId);
  return { isLive: theme.status === 'live' };
}

export async function deleteThemeFile(
  themeId: string,
  path: string,
  tenantId = DEFAULT_TENANT_ID,
): Promise<{ isLive: boolean }> {
  if (PROTECTED_THEME_PATHS.has(path)) {
    throw new Error(`Cannot delete required theme file: ${path}`);
  }

  const { Theme, ThemeFile } = await ensureDb();
  const theme = await Theme.findOne({ _id: themeId, tenantId });
  if (!theme) throw new Error('Theme not found');

  const file = await ThemeFile.findOne({ themeId: theme._id, path });
  if (!file) throw new Error('File not found');

  await deleteThemeObject(file.r2Key);
  await ThemeFile.deleteOne({ themeId: theme._id, path });

  theme.lastSavedAt = new Date();
  await theme.save();
  return { isLive: theme.status === 'live' };
}

export async function getTemplateJson(
  themeId: string,
  templatePath: string,
  tenantId = DEFAULT_TENANT_ID,
): Promise<TemplateJson | null> {
  const normalizedPath = templatePath.startsWith('templates/')
    ? templatePath
    : `templates/${templatePath}`;
  const file = await getThemeFile(themeId, normalizedPath, tenantId);
  if (!file) return null;
  return templateJsonSchema.parse(JSON.parse(file.content));
}

export async function saveTemplateJson(
  themeId: string,
  templatePath: string,
  template: TemplateJson,
  tenantId = DEFAULT_TENANT_ID,
): Promise<TemplateJson> {
  const parsed = templateJsonSchema.parse(template);
  const content = JSON.stringify(parsed, null, 2);
  await upsertThemeFile(themeId, templatePath, content, tenantId);
  return parsed;
}

export async function updateThemeSettingsForTheme(
  themeId: string,
  values: Record<string, unknown>,
  tenantId = DEFAULT_TENANT_ID,
): Promise<{ settings: Record<string, unknown>; isLive: boolean }> {
  const content = JSON.stringify({ current: values }, null, 2);
  const result = await upsertThemeFile(themeId, 'config/settings.json', content, tenantId);
  return { settings: values, isLive: result.isLive };
}

export async function getThemeSchemas(
  themeId: string,
  tenantId = DEFAULT_TENANT_ID,
  options?: { sectionTypes?: string[]; scope?: 'all' | 'template' },
) {
  const theme = await loadThemeById(themeId, tenantId);
  if (!theme) throw new Error('Theme not found');

  const allTypes = listSectionTypes(theme.files);
  const typesToParse =
    options?.scope === 'all' || !options?.sectionTypes?.length
      ? allTypes
      : options.sectionTypes;

  const sectionSchemas =
    options?.scope === 'all' || !options?.sectionTypes?.length
      ? parseAllSectionSchemas(theme.files)
      : parseSectionSchemasForTypes(theme.files, typesToParse);

  const settingsSchemaRaw = theme.files['config/settings_schema.json'];
  let settingsSchema: unknown[] = [];
  if (settingsSchemaRaw) {
    try {
      settingsSchema = themeSettingsSchemaSchema.parse(JSON.parse(settingsSchemaRaw));
    } catch {
      settingsSchema = [];
    }
  }

  return {
    sectionSchemas,
    sectionTypes: allTypes,
    settingsSchema,
    settings: theme.settings,
  };
}

export async function getCustomizerBootstrap(
  themeId: string,
  tenantId = DEFAULT_TENANT_ID,
  options?: { pathname?: string },
) {
  const theme = await loadThemeById(themeId, tenantId);
  if (!theme) throw new Error('Theme not found');

  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is required');
  await connectDatabase(uri);
  const { Page, MetaObjectDefinition } = getModels();

  const [pages, metaObjects] = await Promise.all([
    Page.find({ tenantId, status: 'published' }).lean(),
    MetaObjectDefinition.find({ tenantId, status: 'active' }).lean(),
  ]);

  const pageItems: Array<{
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
    pageItems.push({
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
    pageItems.push({
      id: `${mo.slug}-archive`,
      label: `${mo.name} archive`,
      templatePath: `templates/${key}.archive.json`,
      pathname: archivePath,
      group: 'Meta objects',
    });
    pageItems.push({
      id: `${mo.slug}-single`,
      label: `${mo.singularName ?? mo.name} single`,
      templatePath: `templates/${key}.single.json`,
      pathname: archivePath,
      group: 'Meta objects',
    });
  }

  const homePage =
    pageItems.find((item) => item.templatePath === 'templates/index.json') ?? pageItems[0] ?? null;
  const pathname = options?.pathname ?? homePage?.pathname ?? '/';
  const selectedPage = pageItems.find((item) => item.pathname === pathname) ?? homePage;

  let template: TemplateJson | null = null;
  if (selectedPage) {
    template = await getTemplateJson(themeId, selectedPage.templatePath, tenantId);
  }

  const sectionTypesInTemplate = template ? getSectionTypesFromTemplate(template) : [];
  const sectionSchemas = parseSectionSchemasForTypes(theme.files, sectionTypesInTemplate);

  const settingsSchemaRaw = theme.files['config/settings_schema.json'];
  let settingsSchema: unknown[] = [];
  if (settingsSchemaRaw) {
    try {
      settingsSchema = themeSettingsSchemaSchema.parse(JSON.parse(settingsSchemaRaw));
    } catch {
      settingsSchema = [];
    }
  }

  return {
    theme: {
      id: theme.id,
      name: theme.name,
      slug: theme.slug,
      version: theme.version,
      status: theme.status,
      previewToken: theme.previewToken,
    },
    pages: pageItems,
    page: selectedPage,
    template,
    sectionSchemas,
    sectionTypes: listSectionTypes(theme.files),
    settingsSchema,
    settings: theme.settings,
  };
}

export async function saveTemplateCustomization(
  input: {
    themeId: string;
    resourceType: 'page' | 'meta_entry';
    resourceId: string;
    templateKey: string;
    sectionOverrides: Record<string, Record<string, unknown>>;
  },
  tenantId = DEFAULT_TENANT_ID,
) {
  const { TemplateCustomization } = await ensureDb();

  const item = await TemplateCustomization.findOneAndUpdate(
    {
      tenantId,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
    },
    {
      tenantId,
      themeId: input.themeId,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      templateKey: input.templateKey,
      sectionOverrides: input.sectionOverrides,
    },
    { upsert: true, new: true },
  );

  return {
    templateKey: item.templateKey,
    sectionOverrides: item.sectionOverrides as Record<string, Record<string, unknown>>,
  };
}

export async function getThemeHealth(themeId?: string, tenantId = DEFAULT_TENANT_ID): Promise<{
  issues: ThemeHealthIssue[];
  themeId: string | null;
}> {
  const { Theme, ThemeFile, MetaObjectDefinition } = await ensureDb();

  const theme = themeId
    ? await Theme.findOne({ _id: themeId, tenantId }).lean()
    : await Theme.findOne({ tenantId, $or: [{ status: 'live' }, { isActive: true }] }).lean();

  if (!theme) return { issues: [], themeId: null };

  const themeFiles = await ThemeFile.find({ themeId: theme._id }).lean();
  const filePaths = themeFiles.map((f) => f.path);
  const filesMap = await loadThemeFiles(theme._id);

  const metaObjects = await MetaObjectDefinition.find({ tenantId, status: 'active' }).lean();
  const issues = auditThemeHealth({
    themeFiles: filePaths,
    metaObjects: metaObjects.map((m) => ({
      slug: m.slug,
      templateKey: m.templates?.templateKey ?? m.slug,
      archiveEnabled: m.routing?.archiveEnabled ?? true,
    })),
    sectionTypes: listSectionTypes(filesMap),
  });

  return { issues, themeId: theme._id.toString() };
}

export async function scaffoldTemplateFile(
  themeId: string,
  templatePath: string,
  options: { name: string; sectionType?: string },
): Promise<void> {
  const sectionType =
    options.sectionType ?? (templatePath.includes('archive') ? 'main-archive' : 'main-single');
  const content = JSON.stringify(
    {
      name: options.name,
      sections: {
        main_1: { type: sectionType, settings: {} },
      },
      order: ['main_1'],
    },
    null,
    2,
  );
  await upsertThemeFile(themeId, templatePath, content);
}

export async function getTemplateCustomization(
  resourceType: 'page' | 'meta_entry',
  resourceId: string,
  themeId: string,
  tenantId = DEFAULT_TENANT_ID,
) {
  const { TemplateCustomization } = await ensureDb();
  const item = await TemplateCustomization.findOne({
    tenantId,
    themeId,
    resourceType,
    resourceId,
  }).lean();
  if (!item) return null;
  return {
    templateKey: item.templateKey,
    sectionOverrides: item.sectionOverrides as Record<string, Record<string, unknown>>,
  };
}

export async function renderThemePreview(
  themeId: string,
  options: {
    pathname?: string;
    templatePath?: string;
    templateJson?: TemplateJson;
    sectionOverrides?: Record<string, Record<string, unknown>>;
    context: RenderContextInput;
    view?: Parameters<typeof renderThemedPage>[1]['view'];
    pageTemplateSuffix?: string;
    metaTemplateKey?: string;
    metaEntryTemplateSuffix?: string;
  },
  tenantId = DEFAULT_TENANT_ID,
): Promise<{ html: string; status: number }> {
  const theme = await loadThemeById(themeId, tenantId);
  if (!theme) throw new Error('Theme not found');

  const { html } = await renderThemedPage(theme.files, {
    view: options.view ?? 'home',
    templatePath: options.templatePath,
    templateJson: options.templateJson,
    sectionOverrides: options.sectionOverrides,
    pageTemplateSuffix: options.pageTemplateSuffix,
    metaTemplateKey: options.metaTemplateKey,
    metaEntryTemplateSuffix: options.metaEntryTemplateSuffix,
    context: options.context,
  });

  return { html, status: 200 };
}

export async function renderThemeSection(
  themeId: string,
  options: {
    sectionId: string;
    instance: TemplateJson['sections'][string];
    context: RenderContextInput;
  },
  tenantId = DEFAULT_TENANT_ID,
): Promise<string> {
  const theme = await loadThemeById(themeId, tenantId);
  if (!theme) throw new Error('Theme not found');

  const { engine, fileMap } = createLiquidEngine({
    files: theme.files,
    locales: {},
  });

  const baseContext = {
    shop: options.context.shop,
    request: options.context.request,
    settings: theme.settings,
    page: options.context.page,
    metaobject: options.context.metaobject,
    metaobjects: options.context.metaobjects,
    metaobject_type: options.context.metaobject_type,
    paginate: options.context.paginate,
  };

  return renderSection(engine, fileMap, {
    sectionId: options.sectionId,
    instance: options.instance,
    context: baseContext,
  });
}

export type { ThemeHealthIssue };

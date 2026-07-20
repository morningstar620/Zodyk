import {
  DEFAULT_TENANT_ID,
  auditThemeHealth,
  templateJsonSchema,
  themeSettingsSchemaSchema,
  type TemplateJson,
  type ThemeHealthIssue,
} from '@zodyk/core';
import { connectDatabase, getModels, resolveThemeFileStorageKey } from '@zodyk/database';
import type { Types } from 'mongoose';
import { randomBytes } from 'node:crypto';
import { relative, resolve } from 'node:path';
import { checksum, readThemeDirectory } from './install';
import { PROTECTED_THEME_PATHS, guessContentType } from './storage/content-type';
import {
  getThemeStorage,
  getThemeStorageKind,
} from './storage/create-theme-storage';
import { resolveThemeLocalRoot, themeRoot } from './storage/theme-path';
import type { ThemeFileMeta, ThemeRef } from './storage/types';
import { themeStoragePrefix } from './r2-storage';
import {
  listSectionTypes,
  loadThemeSettings,
  parseAllSectionSchemas,
  parseSectionSchemasForTypes,
  getSectionTypesFromTemplate,
  invalidateLiquidEngineCache,
  renderThemedPage,
  getOrCreateLiquidEngine,
} from './renderer';
import type { RenderContextInput } from './renderer';
import { renderSection } from '@zodyk/liquid';
import {
  buildThemeZipFilename,
  validateThemePath,
  type ThemeZipFile,
} from './zip';
import { buildThemeObjectKey } from '@zodyk/media/objects';

export interface LoadedTheme {
  id: string;
  name: string;
  slug: string;
  version: string;
  status: 'live' | 'draft' | 'archived';
  previewToken: string;
  files: Record<string, string>;
  settings: Record<string, unknown>;
  updatedAt?: string;
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
  storageKind?: 'local' | 'r2';
}

const THEME_CACHE_TTL_MS = 900_000;
const themeCache = new Map<string, { theme: LoadedTheme; cachedAt: number }>();
const themeWatchUnsub = new Map<string, () => void>();

export interface ThemeLoadPhaseRecorder {
  mark(phase: string, startMs: number): void;
  setMeta?(key: string, value: number | string | boolean): void;
}

function themeCacheKey(themeId: string, tenantId: string, updatedAt: string): string {
  return `${tenantId}:${themeId}:${updatedAt}`;
}

export function invalidateThemeCache(themeId: string, tenantId = DEFAULT_TENANT_ID): void {
  const prefix = `${tenantId}:${themeId}:`;
  for (const key of themeCache.keys()) {
    if (key.startsWith(prefix)) themeCache.delete(key);
  }
  invalidateLiquidEngineCache(themeId);
}

function getCachedLoadedTheme(themeId: string, tenantId: string): LoadedTheme | null {
  const prefix = `${tenantId}:${themeId}:`;
  const now = Date.now();
  for (const [key, entry] of themeCache) {
    if (key.startsWith(prefix) && now - entry.cachedAt < THEME_CACHE_TTL_MS) {
      return entry.theme;
    }
  }
  return null;
}

async function ensureDb() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is required');
  await connectDatabase(uri);
  // Storage config is required only for R2 backend (factory / R2Storage).
  getThemeStorage();
  return getModels();
}

function toThemeRef(theme: {
  _id: Types.ObjectId | string;
  tenantId: string;
  slug: string;
  localRoot?: string;
  storagePrefix?: string;
}): ThemeRef {
  return {
    id: theme._id.toString(),
    tenantId: theme.tenantId,
    slug: theme.slug,
    localRoot: theme.localRoot,
    storagePrefix: theme.storagePrefix,
  };
}

function ensureThemeWatch(theme: ThemeRef, tenantId: string): void {
  const storage = getThemeStorage();
  if (storage.kind !== 'local') return;
  const key = `${tenantId}:${theme.id}`;
  if (themeWatchUnsub.has(key)) return;
  const unsub = storage.watch(theme, () => {
    invalidateThemeCache(theme.id, tenantId);
  });
  themeWatchUnsub.set(key, unsub);
}

export async function assertOneLiveTheme(tenantId = DEFAULT_TENANT_ID): Promise<void> {
  const { Theme } = await ensureDb();
  const liveCount = await Theme.countDocuments({ tenantId, status: 'live' });
  if (liveCount !== 1) {
    throw new Error(`Expected exactly one live theme, found ${liveCount}`);
  }
}

async function loadFileMetas(themeId: Types.ObjectId | string): Promise<ThemeFileMeta[]> {
  const { ThemeFile } = await ensureDb();
  const themeFiles = await ThemeFile.find({ themeId }).lean();
  return themeFiles.map((f) => ({
    path: f.path,
    storageKey: resolveThemeFileStorageKey(f),
    content: f.content,
  }));
}

  async function loadThemeFiles(
  theme: {
    _id: Types.ObjectId;
    tenantId: string;
    slug: string;
    localRoot?: string;
    storagePrefix?: string;
  },
  recorder?: ThemeLoadPhaseRecorder,
): Promise<Record<string, string>> {
  const storage = getThemeStorage();
  const ref = toThemeRef(theme);

  const filesDbStart = performance.now();
  const metas = storage.kind === 'r2' ? await loadFileMetas(theme._id) : undefined;
  recorder?.mark('theme-files-db', filesDbStart);

  const loadStart = performance.now();
  const files = await storage.loadTheme(ref, metas);
  recorder?.mark(storage.kind === 'local' ? 'theme-fs' : 'theme-r2', loadStart);
  recorder?.setMeta?.('theme-file-count', Object.keys(files).length);

  if (storage.kind === 'local' && Object.keys(files).length > 0) {
    const { ThemeFile } = await ensureDb();
    const count = await ThemeFile.countDocuments({ themeId: theme._id });
    if (count === 0) {
      await syncThemeFileRows(
        theme._id,
        Object.entries(files).map(([path, content]) => ({
          path,
          storageKey: path,
          size: Buffer.byteLength(content, 'utf8'),
          checksum: checksum(content),
          contentType: guessContentType(path),
        })),
      );
    }
  }

  ensureThemeWatch(ref, theme.tenantId);
  return files;
}

function toLoadedTheme(
  theme: {
    _id: Types.ObjectId;
    name: string;
    slug: string;
    version: string;
    status: 'live' | 'draft' | 'archived';
    previewToken: string;
    updatedAt?: Date;
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
    updatedAt: theme.updatedAt?.toISOString(),
  };
}

async function syncThemeFileRows(
  themeId: Types.ObjectId,
  results: Array<{
    path: string;
    storageKey: string;
    size: number;
    checksum: string;
    contentType: string;
  }>,
): Promise<void> {
  const { ThemeFile } = await ensureDb();
  await ThemeFile.deleteMany({ themeId });
  if (results.length === 0) return;
  await ThemeFile.insertMany(
    results.map((r) => ({
      themeId,
      path: r.path,
      storageKey: r.storageKey,
      size: r.size,
      checksum: r.checksum,
      contentType: r.contentType,
    })),
  );
}

async function installThemeFiles(
  theme: {
    _id: Types.ObjectId;
    tenantId: string;
    slug: string;
    localRoot?: string;
    storagePrefix?: string;
  },
  files: ThemeZipFile[],
): Promise<void> {
  const { Theme } = await ensureDb();
  const storage = getThemeStorage();
  const ref = toThemeRef(theme);

  const existingMetas =
    storage.kind === 'r2' ? await loadFileMetas(theme._id) : undefined;
  if (existingMetas && existingMetas.length > 0) {
    await storage.deleteTheme(ref);
  }

  const installed = await storage.installTheme(
    ref,
    files.map((f) => ({ path: f.path, content: f.content, contentType: f.contentType })),
  );

  const prefix = installed.storagePrefix ?? themeStoragePrefix(theme.tenantId, theme._id.toString());
  if (!theme.storagePrefix || theme.storagePrefix !== prefix) {
    await Theme.updateOne({ _id: theme._id }, { storagePrefix: prefix });
    theme.storagePrefix = prefix;
  }

  await syncThemeFileRows(theme._id, installed.files);
}

function localRootForDirectory(dir: string, slug: string): string | undefined {
  const base = resolveThemeLocalRoot();
  const absolute = resolve(dir);
  const expected = themeRoot({ slug });
  if (absolute === resolve(expected)) return undefined;
  const rel = relative(base, absolute);
  if (!rel.startsWith('..')) return rel.replace(/\\/g, '/');
  return absolute;
}

export async function loadThemeById(
  themeId: string,
  tenantId = DEFAULT_TENANT_ID,
  recorder?: ThemeLoadPhaseRecorder,
): Promise<LoadedTheme | null> {
  const { Theme } = await ensureDb();

  const dbStart = performance.now();
  const theme = await Theme.findOne({ _id: themeId, tenantId }).lean();
  recorder?.mark('theme-db', dbStart);

  if (!theme) return null;

  const updatedAt = theme.updatedAt?.toISOString() ?? '';
  const cacheKey = themeCacheKey(themeId, tenantId, updatedAt);
  const cached = themeCache.get(cacheKey);
  if (cached && Date.now() - cached.cachedAt < THEME_CACHE_TTL_MS) {
    recorder?.setMeta?.('theme-cache-hit', 1);
    ensureThemeWatch(toThemeRef(theme), tenantId);
    return cached.theme;
  }

  const files = await loadThemeFiles(theme, recorder);
  const loaded = toLoadedTheme(theme, files);
  themeCache.set(cacheKey, { theme: loaded, cachedAt: Date.now() });
  return loaded;
}

export async function loadActiveTheme(tenantId = DEFAULT_TENANT_ID): Promise<LoadedTheme | null> {
  const { Theme } = await ensureDb();
  const theme = await Theme.findOne({
    tenantId,
    $or: [{ status: 'live' }, { isActive: true }],
  })
    .select('_id')
    .lean();
  if (!theme) return null;
  return loadThemeById(theme._id.toString(), tenantId);
}

export async function loadThemeByPreview(
  themeId: string,
  previewToken: string,
  tenantId = DEFAULT_TENANT_ID,
): Promise<LoadedTheme | null> {
  const { Theme } = await ensureDb();
  const theme = await Theme.findOne({ _id: themeId, tenantId, previewToken })
    .select('_id')
    .lean();
  if (!theme) return null;
  return loadThemeById(theme._id.toString(), tenantId);
}

/** Read a single theme asset without loading the full theme file map. */
export async function getThemeAssetFile(
  assetPath: string,
  options: {
    previewThemeId?: string;
    previewToken?: string;
    tenantId?: string;
  } = {},
): Promise<{ content: string; contentType: string } | null> {
  const tenantId = options.tenantId ?? DEFAULT_TENANT_ID;
  const path = assetPath.startsWith('assets/') ? assetPath : `assets/${assetPath}`;
  const { Theme } = await ensureDb();

  let themeId: string | null = null;

  if (options.previewThemeId && options.previewToken) {
    const theme = await Theme.findOne({
      _id: options.previewThemeId,
      tenantId,
      previewToken: options.previewToken,
    })
      .select('_id')
      .lean();
    if (!theme) return null;
    themeId = theme._id.toString();
  } else {
    const theme = await Theme.findOne({
      tenantId,
      $or: [{ status: 'live' }, { isActive: true }],
    })
      .select('_id')
      .lean();
    if (!theme) return null;
    themeId = theme._id.toString();
  }

  const cached = getCachedLoadedTheme(themeId, tenantId);
  if (cached) {
    const content = cached.files[path];
    if (content == null) return null;
    return { content, contentType: guessContentType(path) };
  }

  return getThemeFile(themeId, path, tenantId);
}

export async function installThemeFromDirectory(
  dir: string,
  options: { name: string; slug: string; version?: string; activate?: boolean; tenantId?: string },
): Promise<{ themeId: string }> {
  const { Theme } = await ensureDb();
  const tenantId = options.tenantId ?? DEFAULT_TENANT_ID;
  const files = await readThemeDirectory(dir);
  const localRoot = getThemeStorageKind() === 'local' ? localRootForDirectory(dir, options.slug) : undefined;

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
      localRoot,
      previewToken: randomBytes(24).toString('hex'),
      publishedAt: options.activate ? new Date() : undefined,
      lastSavedAt: new Date(),
    });
  } else {
    theme.version = options.version ?? theme.version;
    if (localRoot !== undefined) theme.localRoot = localRoot;
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
  invalidateThemeCache(theme._id.toString(), tenantId);
  return { themeId: theme._id.toString() };
}

export async function installThemeFromZip(
  buffer: Buffer,
  options: { name: string; slug: string; version?: string; tenantId?: string },
): Promise<{ themeId: string }> {
  const { Theme } = await ensureDb();
  const tenantId = options.tenantId ?? DEFAULT_TENANT_ID;
  const storage = getThemeStorage();

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

  const ref = toThemeRef(theme);
  const installed = await storage.importTheme(ref, buffer);
  if (installed.storagePrefix) {
    theme.storagePrefix = installed.storagePrefix;
    await theme.save();
  }
  await syncThemeFileRows(theme._id, installed.files);
  invalidateThemeCache(theme._id.toString(), tenantId);
  return { themeId: theme._id.toString() };
}

export async function exportThemeAsZip(
  themeId: string,
  tenantId = DEFAULT_TENANT_ID,
): Promise<{ buffer: Buffer; filename: string; name: string }> {
  const { Theme } = await ensureDb();
  const theme = await Theme.findOne({ _id: themeId, tenantId }).lean();
  if (!theme) throw new Error('Theme not found');

  const storage = getThemeStorage();
  const metas = storage.kind === 'r2' ? await loadFileMetas(theme._id) : undefined;
  const buffer = await storage.exportTheme(toThemeRef(theme), metas);
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
  invalidateThemeCache(themeId, tenantId);
  await assertOneLiveTheme(tenantId);
}

export async function duplicateTheme(
  themeId: string,
  tenantId = DEFAULT_TENANT_ID,
): Promise<{ themeId: string }> {
  const { Theme, ThemeFile } = await ensureDb();
  const source = await Theme.findOne({ _id: themeId, tenantId });
  if (!source) throw new Error('Theme not found');
  const suffix = Date.now().toString(36);
  const newSlug = `${source.slug}-copy-${suffix}`;
  const storage = getThemeStorage();

  const copy = await Theme.create({
    name: `${source.name} (Copy)`,
    slug: newSlug,
    version: source.version,
    status: 'draft',
    isActive: false,
    tenantId,
    sourceThemeId: source._id,
    storagePrefix: storage.kind === 'r2' ? themeStoragePrefix(tenantId, 'pending') : '',
    previewToken: randomBytes(24).toString('hex'),
    lastSavedAt: new Date(),
  });

  if (storage.kind === 'r2') {
    copy.storagePrefix = themeStoragePrefix(tenantId, copy._id.toString());
    await copy.save();
  }

  const sourceRef = toThemeRef(source);
  const destRef = toThemeRef(copy);
  await storage.duplicateTheme(sourceRef, destRef);

  const sourceFiles = await ThemeFile.find({ themeId: source._id }).lean();
  const rows = sourceFiles.map((f) => {
    const storageKey =
      storage.kind === 'local'
        ? f.path
        : buildThemeObjectKey(tenantId, copy._id.toString(), f.path);
    return {
      themeId: copy._id,
      path: f.path,
      storageKey,
      size: f.size,
      checksum: f.checksum,
      contentType: f.contentType,
    };
  });
  if (rows.length > 0) {
    await ThemeFile.insertMany(rows);
  }

  invalidateThemeCache(themeId, tenantId);
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

  const storage = getThemeStorage();
  await storage.deleteTheme(toThemeRef(theme));
  await ThemeFile.deleteMany({ themeId: theme._id });
  await Theme.deleteOne({ _id: theme._id });
  invalidateThemeCache(themeId, tenantId);

  const watchKey = `${tenantId}:${themeId}`;
  themeWatchUnsub.get(watchKey)?.();
  themeWatchUnsub.delete(watchKey);

  await assertOneLiveTheme(tenantId);
}

export async function listThemes(tenantId = DEFAULT_TENANT_ID): Promise<ThemeListItem[]> {
  const { Theme } = await ensureDb();
  const items = await Theme.find({ tenantId }).sort({ status: 1, name: 1 }).lean();
  const storageKind = getThemeStorageKind();
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
    storageKind,
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
    storageKind: getThemeStorageKind(),
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
  if (!file && getThemeStorageKind() !== 'local') return null;

  const storage = getThemeStorage();
  const meta = file
    ? {
        path: file.path,
        storageKey: resolveThemeFileStorageKey(file),
        content: file.content,
      }
    : undefined;

  try {
    const content = await storage.readFile(toThemeRef(theme), path, meta);
    return {
      path,
      content,
      contentType: file?.contentType ?? guessContentType(path),
    };
  } catch {
    return null;
  }
}

export async function upsertThemeFile(
  themeId: string,
  path: string,
  content: string,
  tenantId = DEFAULT_TENANT_ID,
): Promise<{ isLive: boolean }> {
  if (!validateThemePath(path)) {
    throw new Error('Invalid theme file path');
  }
  const { Theme, ThemeFile } = await ensureDb();
  const theme = await Theme.findOne({ _id: themeId, tenantId });
  if (!theme) throw new Error('Theme not found');

  const storage = getThemeStorage();
  const stored = await storage.writeFile(toThemeRef(theme), path, content);

  if (!theme.storagePrefix && storage.kind === 'r2') {
    theme.storagePrefix = themeStoragePrefix(tenantId, themeId);
  }

  await ThemeFile.findOneAndUpdate(
    { themeId: theme._id, path },
    {
      $set: {
        themeId: theme._id,
        path,
        storageKey: stored.storageKey,
        size: stored.size,
        checksum: stored.checksum,
        contentType: stored.contentType,
      },
      $unset: { content: '', r2Key: '' },
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
  if (!file && getThemeStorageKind() !== 'local') {
    throw new Error('File not found');
  }

  const storage = getThemeStorage();
  const storageKey = file ? resolveThemeFileStorageKey(file) : path;
  await storage.deleteFile(toThemeRef(theme), path, storageKey);
  if (file) {
    await ThemeFile.deleteOne({ themeId: theme._id, path });
  }

  theme.lastSavedAt = new Date();
  await theme.save();
  invalidateThemeCache(themeId, tenantId);
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
  options?: {
    sectionTypes?: string[];
    scope?: 'all' | 'template';
    theme?: LoadedTheme;
  },
) {
  const theme = options?.theme ?? (await loadThemeById(themeId, tenantId));
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
      storageKind: getThemeStorageKind(),
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

export async function getThemeHealth(
  themeId?: string,
  tenantId = DEFAULT_TENANT_ID,
  options?: {
    files?: Record<string, string>;
    filePaths?: string[];
    metaObjects?: Array<{
      slug: string;
      templates?: { templateKey?: string };
      routing?: { archiveEnabled?: boolean };
    }>;
  },
): Promise<{
  issues: ThemeHealthIssue[];
  themeId: string | null;
}> {
  const { Theme, ThemeFile, MetaObjectDefinition } = await ensureDb();

  const theme = themeId
    ? await Theme.findOne({ _id: themeId, tenantId }).lean()
    : await Theme.findOne({ tenantId, $or: [{ status: 'live' }, { isActive: true }] }).lean();

  if (!theme) return { issues: [], themeId: null };

  const filePaths =
    options?.filePaths ??
    (await ThemeFile.find({ themeId: theme._id }).lean()).map((f) => f.path);
  const filesMap = options?.files ?? (await loadThemeFiles(theme));

  const metaObjects =
    options?.metaObjects ??
    (await MetaObjectDefinition.find({ tenantId, status: 'active' }).lean());
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
    themeId: theme.id,
    themeUpdatedAt: theme.updatedAt,
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

  const { engine, fileMap } = getOrCreateLiquidEngine(theme.files, {
    themeId: theme.id,
    themeUpdatedAt: theme.updatedAt,
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

export function getThemeStorageStatus(): { kind: 'local' | 'r2'; label: string } {
  const kind = getThemeStorageKind();
  return {
    kind,
    label: kind === 'local' ? 'Local files' : 'Cloud (R2)',
  };
}

export type { ThemeHealthIssue };

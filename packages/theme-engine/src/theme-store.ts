import {
  DEFAULT_TENANT_ID,
  auditThemeHealth,
  templateJsonSchema,
  themeSettingsSchemaSchema,
  type TemplateJson,
  type ThemeHealthIssue,
} from '@zodyk/core';
import { connectDatabase, getModels } from '@zodyk/database';
import type { Types } from 'mongoose';
import { randomBytes } from 'node:crypto';
import { checksum, filesToMap, readThemeDirectory } from './install';
import {
  listSectionTypes,
  loadThemeSettings,
  parseAllSectionSchemas,
  renderThemedPage,
} from './renderer';
import type { RenderContextInput } from './renderer';
import { createLiquidEngine, renderSection } from '@zodyk/liquid';

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

function guessContentType(path: string): string {
  if (path.endsWith('.json')) return 'application/json';
  if (path.endsWith('.css')) return 'text/css';
  if (path.endsWith('.js')) return 'application/javascript';
  if (path.endsWith('.liquid')) return 'text/x-liquid';
  return 'text/plain';
}

async function loadThemeFiles(themeId: Types.ObjectId | string): Promise<Record<string, string>> {
  const { ThemeFile } = getModels();
  const themeFiles = await ThemeFile.find({ themeId }).lean();
  return filesToMap(themeFiles.map((f) => ({ path: f.path, content: f.content })));
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

export async function loadThemeById(
  themeId: string,
  tenantId = DEFAULT_TENANT_ID,
): Promise<LoadedTheme | null> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is required');
  await connectDatabase(uri);
  const { Theme } = getModels();

  const theme = await Theme.findOne({ _id: themeId, tenantId }).lean();
  if (!theme) return null;

  const files = await loadThemeFiles(theme._id);
  return toLoadedTheme(theme, files);
}

export async function loadActiveTheme(tenantId = DEFAULT_TENANT_ID): Promise<LoadedTheme | null> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is required');
  await connectDatabase(uri);
  const { Theme } = getModels();

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
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is required');
  await connectDatabase(uri);
  const { Theme } = getModels();

  const theme = await Theme.findOne({ _id: themeId, tenantId, previewToken }).lean();
  if (!theme) return null;

  const files = await loadThemeFiles(theme._id);
  return toLoadedTheme(theme, files);
}

export async function installThemeFromDirectory(
  dir: string,
  options: { name: string; slug: string; version?: string; activate?: boolean; tenantId?: string },
): Promise<{ themeId: string }> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is required');
  await connectDatabase(uri);
  const { Theme, ThemeFile } = getModels();
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
      previewToken: randomBytes(24).toString('hex'),
      publishedAt: options.activate ? new Date() : undefined,
      lastSavedAt: new Date(),
    });
  } else {
    theme.version = options.version ?? theme.version;
    await theme.save();
    await ThemeFile.deleteMany({ themeId: theme._id });
  }

  await ThemeFile.insertMany(
    files.map((file) => ({
      themeId: theme!._id,
      path: file.path,
      content: file.content,
      checksum: checksum(file.content),
      contentType: file.contentType,
    })),
  );

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

  return { themeId: theme._id.toString() };
}

export async function activateTheme(themeId: string, tenantId = DEFAULT_TENANT_ID): Promise<void> {
  await publishTheme(themeId, tenantId);
}

export async function publishTheme(themeId: string, tenantId = DEFAULT_TENANT_ID): Promise<void> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is required');
  await connectDatabase(uri);
  const { Theme } = getModels();

  const draft = await Theme.findOne({ _id: themeId, tenantId });
  if (!draft) throw new Error('Theme not found');
  if (draft.status === 'live') return;

  await Theme.updateMany(
    { tenantId, status: 'live' },
    { status: 'archived', isActive: false },
  );

  draft.status = 'live';
  draft.isActive = true;
  draft.publishedAt = new Date();
  await draft.save();
}

export async function duplicateTheme(
  themeId: string,
  tenantId = DEFAULT_TENANT_ID,
): Promise<{ themeId: string }> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is required');
  await connectDatabase(uri);
  const { Theme, ThemeFile } = getModels();

  const source = await Theme.findOne({ _id: themeId, tenantId });
  if (!source) throw new Error('Theme not found');

  const sourceFiles = await ThemeFile.find({ themeId: source._id }).lean();
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

  if (sourceFiles.length > 0) {
    await ThemeFile.insertMany(
      sourceFiles.map((f) => ({
        themeId: copy._id,
        path: f.path,
        content: f.content,
        checksum: f.checksum,
        contentType: f.contentType,
      })),
    );
  }

  return { themeId: copy._id.toString() };
}

export async function deleteTheme(themeId: string, tenantId = DEFAULT_TENANT_ID): Promise<void> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is required');
  await connectDatabase(uri);
  const { Theme, ThemeFile } = getModels();

  const theme = await Theme.findOne({ _id: themeId, tenantId });
  if (!theme) throw new Error('Theme not found');
  if (theme.status === 'live') throw new Error('Cannot delete the live theme');

  await ThemeFile.deleteMany({ themeId: theme._id });
  await Theme.deleteOne({ _id: theme._id });
}

export async function listThemes(tenantId = DEFAULT_TENANT_ID): Promise<ThemeListItem[]> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is required');
  await connectDatabase(uri);
  const { Theme } = getModels();
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
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is required');
  await connectDatabase(uri);
  const { Theme, ThemeFile } = getModels();

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
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is required');
  await connectDatabase(uri);
  const { Theme, ThemeFile } = getModels();

  const theme = await Theme.findOne({ _id: themeId, tenantId }).lean();
  if (!theme) return null;

  const file = await ThemeFile.findOne({ themeId: theme._id, path }).lean();
  if (!file) return null;

  return { path: file.path, content: file.content, contentType: file.contentType };
}

export async function upsertThemeFile(
  themeId: string,
  path: string,
  content: string,
  tenantId = DEFAULT_TENANT_ID,
): Promise<void> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is required');
  await connectDatabase(uri);
  const { Theme, ThemeFile } = getModels();

  const theme = await Theme.findOne({ _id: themeId, tenantId });
  if (!theme) throw new Error('Theme not found');

  await ThemeFile.findOneAndUpdate(
    { themeId: theme._id, path },
    {
      themeId: theme._id,
      path,
      content,
      checksum: checksum(content),
      contentType: guessContentType(path),
    },
    { upsert: true, new: true },
  );

  theme.lastSavedAt = new Date();
  await theme.save();
}

export async function deleteThemeFile(
  themeId: string,
  path: string,
  tenantId = DEFAULT_TENANT_ID,
): Promise<void> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is required');
  await connectDatabase(uri);
  const { Theme, ThemeFile } = getModels();

  const theme = await Theme.findOne({ _id: themeId, tenantId });
  if (!theme) throw new Error('Theme not found');

  await ThemeFile.deleteOne({ themeId: theme._id, path });
  theme.lastSavedAt = new Date();
  await theme.save();
}

export async function getTemplateJson(
  themeId: string,
  templatePath: string,
  tenantId = DEFAULT_TENANT_ID,
): Promise<TemplateJson | null> {
  const file = await getThemeFile(themeId, templatePath, tenantId);
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
): Promise<Record<string, unknown>> {
  const content = JSON.stringify({ current: values }, null, 2);
  await upsertThemeFile(themeId, 'config/settings.json', content, tenantId);
  return values;
}

export async function getThemeSchemas(themeId: string, tenantId = DEFAULT_TENANT_ID) {
  const theme = await loadThemeById(themeId, tenantId);
  if (!theme) throw new Error('Theme not found');

  const sectionSchemas = parseAllSectionSchemas(theme.files);
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
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is required');
  await connectDatabase(uri);
  const { TemplateCustomization } = getModels();

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
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is required');
  await connectDatabase(uri);
  const { Theme, ThemeFile, MetaObjectDefinition } = getModels();

  const theme = themeId
    ? await Theme.findOne({ _id: themeId, tenantId }).lean()
    : await Theme.findOne({ tenantId, $or: [{ status: 'live' }, { isActive: true }] }).lean();

  if (!theme) return { issues: [], themeId: null };

  const themeFiles = await ThemeFile.find({ themeId: theme._id }).lean();
  const filePaths = themeFiles.map((f) => f.path);
  const filesMap = filesToMap(themeFiles.map((f) => ({ path: f.path, content: f.content })));

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
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is required');
  await connectDatabase(uri);
  const { TemplateCustomization } = getModels();
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

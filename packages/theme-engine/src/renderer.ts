import {
  mergeTemplateWithOverrides,
  resolveTemplatePath,
  templateJsonSchema,
  type SectionOverride,
  type TemplateJson,
  type ViewType,
} from '@zodyk/core';
import {
  createLiquidEngine,
  parseSectionSchema,
  renderLayout,
  renderSection,
} from '@zodyk/liquid';
import type { Liquid, ThemeFileMap } from '@zodyk/liquid';

export interface ShopContext {
  name: string;
  url: string;
  currency: string;
}

export interface RequestContext {
  path: string;
  locale: string;
}

export interface PageLiquidContext {
  id: string;
  title: string;
  handle: string;
  slug: string;
  body?: string;
  template_suffix?: string;
  seo?: Record<string, unknown>;
}

export interface MetaObjectLiquidContext {
  handle: string;
  id: string;
  [key: string]: unknown;
}

export interface RenderContextInput {
  shop: ShopContext;
  request: RequestContext;
  settings: Record<string, unknown>;
  page?: PageLiquidContext;
  metaobject?: MetaObjectLiquidContext;
  metaobjects?: MetaObjectLiquidContext[];
  metaobject_type?: {
    slug: string;
    name: string;
    singular_name?: string;
  };
  paginate?: {
    current_page: number;
    pages: number;
    items: number;
    page_size: number;
  };
  linklists?: Record<string, Record<string, unknown>>;
  menus?: Record<string, Record<string, unknown>>;
}

const liquidEngineCache = new Map<
  string,
  { engine: Liquid; fileMap: ThemeFileMap; cachedAt: number }
>();

function liquidEngineCacheKey(themeId: string, updatedAt: string): string {
  return `${themeId}:${updatedAt}`;
}

export function invalidateLiquidEngineCache(themeId?: string): void {
  if (!themeId) {
    liquidEngineCache.clear();
    return;
  }
  const prefix = `${themeId}:`;
  for (const key of liquidEngineCache.keys()) {
    if (key.startsWith(prefix)) liquidEngineCache.delete(key);
  }
}

export function getOrCreateLiquidEngine(
  files: Record<string, string>,
  options?: { themeId?: string; themeUpdatedAt?: string },
): { engine: Liquid; fileMap: ThemeFileMap } {
  const locales = parseLocales(files);
  const themeId = options?.themeId;
  const updatedAt = options?.themeUpdatedAt ?? '';

  if (themeId) {
    const key = liquidEngineCacheKey(themeId, updatedAt);
    const cached = liquidEngineCache.get(key);
    if (cached) return { engine: cached.engine, fileMap: cached.fileMap };

    const created = createLiquidEngine({ files, locales });
    liquidEngineCache.set(key, { ...created, cachedAt: Date.now() });
    return created;
  }

  return createLiquidEngine({ files, locales });
}

export function buildBaseContext(input: RenderContextInput): Record<string, unknown> {
  return {
    shop: input.shop,
    request: input.request,
    settings: input.settings,
    page: input.page,
    metaobject: input.metaobject,
    metaobjects: input.metaobjects ?? [],
    metaobject_type: input.metaobject_type,
    paginate: input.paginate,
    linklists: input.linklists ?? {},
    menus: input.menus ?? input.linklists ?? {},
    routes: {
      root: input.shop.url,
    },
  };
}

export async function renderTemplateJson(
  engine: Liquid,
  fileMap: ThemeFileMap,
  template: TemplateJson,
  context: Record<string, unknown>,
): Promise<string> {
  const parts: string[] = [];
  for (const sectionId of template.order) {
    const instance = template.sections[sectionId];
    if (!instance) continue;
    parts.push(
      await renderSection(engine, fileMap, {
        sectionId,
        instance,
        context,
      }),
    );
  }
  return parts.join('\n');
}

export async function renderThemedPage(
  files: Record<string, string>,
  options: {
    view: ViewType;
    pageTemplateSuffix?: string;
    metaTemplateKey?: string;
    metaEntryTemplateSuffix?: string;
    templateJson?: TemplateJson;
    templatePath?: string;
    sectionOverrides?: Record<string, SectionOverride>;
    context: RenderContextInput;
    layoutPath?: string;
    themeId?: string;
    themeUpdatedAt?: string;
  },
): Promise<{ html: string; templatePath: string | null }> {
  const filePaths = Object.keys(files);
  const resolved = options.templatePath
    ? { path: options.templatePath, templateKey: options.templatePath, fallbackUsed: false }
    : resolveTemplatePath(filePaths, {
        view: options.view,
        pageTemplateSuffix: options.pageTemplateSuffix,
        metaTemplateKey: options.metaTemplateKey,
        metaEntryTemplateSuffix: options.metaEntryTemplateSuffix,
      });

  if (!resolved && !options.templateJson) {
    return { html: '<!-- no template found -->', templatePath: null };
  }

  const templateRaw = options.templateJson
    ? options.templateJson
    : templateJsonSchema.parse(JSON.parse(files[resolved!.path]!));

  const merged = mergeTemplateWithOverrides(templateRaw, options.sectionOverrides ?? {});
  const { engine, fileMap } = getOrCreateLiquidEngine(files, {
    themeId: options.themeId,
    themeUpdatedAt: options.themeUpdatedAt,
  });
  const baseContext = buildBaseContext(options.context);
  const contentForLayout = await renderTemplateJson(engine, fileMap, merged, baseContext);
  const layoutPath = options.layoutPath ?? 'layout/theme.liquid';
  const html = await renderLayout(engine, fileMap, layoutPath, contentForLayout, baseContext);

  return { html, templatePath: resolved?.path ?? options.templatePath ?? null };
}

function parseLocales(files: Record<string, string>): Record<string, string> {
  const en = files['locales/en.json'];
  if (!en) return {};
  try {
    const parsed = JSON.parse(en) as Record<string, unknown>;
    const flat: Record<string, string> = {};
    flattenLocale('', parsed, flat);
    return flat;
  } catch {
    return {};
  }
}

function flattenLocale(prefix: string, obj: Record<string, unknown>, out: Record<string, string>): void {
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') {
      out[fullKey] = value;
    } else if (value && typeof value === 'object') {
      flattenLocale(fullKey, value as Record<string, unknown>, out);
    }
  }
}

export function loadThemeSettings(files: Record<string, string>): Record<string, unknown> {
  const settingsRaw = files['config/settings.json'];
  if (!settingsRaw) return {};
  try {
    const current = JSON.parse(settingsRaw) as Record<string, unknown>;
    return current.current ? (current.current as Record<string, unknown>) : current;
  } catch {
    return {};
  }
}

export function listSectionTypes(files: Record<string, string>): string[] {
  return Object.keys(files)
    .filter((p) => p.startsWith('sections/') && p.endsWith('.liquid'))
    .map((p) => p.replace('sections/', '').replace('.liquid', ''));
}

export function parseAllSectionSchemas(
  files: Record<string, string>,
): Record<string, ReturnType<typeof parseSectionSchema>> {
  return parseSectionSchemasForTypes(files, listSectionTypes(files));
}

export function parseSectionSchemasForTypes(
  files: Record<string, string>,
  types: string[],
): Record<string, ReturnType<typeof parseSectionSchema>> {
  const result: Record<string, ReturnType<typeof parseSectionSchema>> = {};
  for (const type of types) {
    const path = `sections/${type}.liquid`;
    const content = files[path];
    if (content) result[type] = parseSectionSchema(content);
  }
  return result;
}

export function getSectionTypesFromTemplate(template: TemplateJson): string[] {
  return [...new Set(Object.values(template.sections).map((section) => section.type))];
}

export { resolveTemplatePath, mergeTemplateWithOverrides };

import {
  DEFAULT_TENANT_ID,
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
  const locales = parseLocales(files);
  const { engine, fileMap } = createLiquidEngine({ files, locales });
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
  const result: Record<string, ReturnType<typeof parseSectionSchema>> = {};
  for (const path of Object.keys(files)) {
    if (!path.startsWith('sections/') || !path.endsWith('.liquid')) continue;
    const type = path.replace('sections/', '').replace('.liquid', '');
    result[type] = parseSectionSchema(files[path]!);
  }
  return result;
}

export { resolveTemplatePath, mergeTemplateWithOverrides };

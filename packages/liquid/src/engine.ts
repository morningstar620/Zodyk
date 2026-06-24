import { Liquid } from 'liquidjs';
import type { BlockInstance, SectionInstance } from '@zodyk/core';
import { scopeCustomCss, sectionWrapperId } from './css';
import { resolveDynamicSettings } from './filters';
import { createThemeFileMap, registerThemeTags, type ThemeFileMap } from './loader';
import { registerZodykFilters } from './filters';
import { parseSectionSchema, splitSectionLiquid } from './schema';

export interface LiquidEngineOptions {
  files: Record<string, string>;
  locales?: Record<string, string>;
  renderTimeoutMs?: number;
}

export interface RenderSectionOptions {
  sectionId: string;
  instance: SectionInstance;
  context: Record<string, unknown>;
}

export function createLiquidEngine(options: LiquidEngineOptions): {
  engine: Liquid;
  fileMap: ThemeFileMap;
} {
  const fileMap = createThemeFileMap(options.files);
  const templates: Record<string, string> = {};

  for (const [path, content] of Object.entries(options.files)) {
    templates[path] = content;
    if (path.startsWith('snippets/') && path.endsWith('.liquid')) {
      const shortName = path.replace('snippets/', '').replace('.liquid', '');
      templates[shortName] = content;
      templates[`snippets/${shortName}`] = content;
    }
  }

  const engine = new Liquid({
    cache: true,
    strictFilters: false,
    strictVariables: false,
    renderLimit: 1_000_000,
    parseLimit: 1e6,
    memoryLimit: 1e7,
    templates,
    dynamicPartials: true,
  });

  registerThemeTags(engine);
  registerZodykFilters(engine, options.locales ?? {});

  return { engine, fileMap };
}

function orderedBlocks(instance: SectionInstance): Array<BlockInstance & { id: string }> {
  const blocks = instance.blocks ?? {};
  const order = instance.block_order ?? Object.keys(blocks);
  return order
    .filter((id) => blocks[id])
    .map((id) => ({ id, ...blocks[id]! }));
}

export async function renderSection(
  engine: Liquid,
  fileMap: ThemeFileMap,
  options: RenderSectionOptions,
): Promise<string> {
  const { sectionId, instance, context } = options;
  const sectionPath = `sections/${instance.type}.liquid`;
  const content = fileMap.get(sectionPath);
  if (!content) {
    return `<!-- missing section type: ${instance.type} -->`;
  }

  const { markup } = splitSectionLiquid(content);
  const wrapperId = sectionWrapperId(sectionId);
  const resolvedSettings = resolveDynamicSettings(instance.settings, context);
  const blocks = orderedBlocks(instance).map((block) => ({
    ...block,
    settings: resolveDynamicSettings(block.settings, context),
  }));

  const sectionContext = {
    ...context,
    section: {
      id: sectionId,
      type: instance.type,
      settings: resolvedSettings,
      blocks,
      block_order: instance.block_order ?? blocks.map((b) => b.id),
    },
  };

  const innerHtml = await engine.parseAndRender(markup, sectionContext);
  const customCss =
    typeof resolvedSettings.custom_css === 'string'
      ? resolvedSettings.custom_css
      : instance.custom_css;
  const scopedCss = customCss ? scopeCustomCss(customCss, wrapperId) : '';
  const styleTag = scopedCss ? `<style>${scopedCss}</style>` : '';

  return `<div id="${wrapperId}" class="zodyk-section zodyk-section--${instance.type}" data-section-id="${sectionId}">${styleTag}${innerHtml}</div>`;
}

export async function renderSnippet(
  engine: Liquid,
  fileMap: ThemeFileMap,
  name: string,
  props: Record<string, unknown>,
  context: Record<string, unknown>,
): Promise<string> {
  const snippetPath = `snippets/${name}.liquid`;
  const content = fileMap.get(snippetPath);
  if (!content) return `<!-- missing snippet: ${name} -->`;
  return engine.parseAndRender(content, { ...context, ...props });
}

export async function renderLayout(
  engine: Liquid,
  fileMap: ThemeFileMap,
  layoutPath: string,
  contentForLayout: string,
  context: Record<string, unknown>,
): Promise<string> {
  const layoutContent = fileMap.get(layoutPath) ?? fileMap.get('layout/theme.liquid');
  if (!layoutContent) {
    return contentForLayout;
  }

  const fullContext = {
    ...context,
    content_for_layout: `<div id="zodyk-page" data-zodyk-page>${contentForLayout}</div>`,
    content_for_header: '',
  };

  return engine.parseAndRender(layoutContent, fullContext);
}

export { parseSectionSchema, splitSectionLiquid };
export { createThemeFileMap, type ThemeFileMap };
export { scopeCustomCss, sanitizeCustomCss, sectionWrapperId, blockWrapperId } from './css';

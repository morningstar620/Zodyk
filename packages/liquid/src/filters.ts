import type { Liquid } from 'liquidjs';
import type { DynamicSourceValue } from '@zodyk/core';

const HTML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

/** Escape a value before placing it inside an HTML attribute. */
export function escapeHtmlAttribute(value: unknown): string {
  return String(value).replace(/[&<>"']/g, (character) => HTML_ESCAPES[character]!);
}

function hasControlCharacter(value: string): boolean {
  for (const character of value) {
    const code = character.codePointAt(0)!;
    if (code < 0x20 || code === 0x7f) return true;
  }
  return false;
}

/**
 * Accept only http(s) or single-slash root-relative URLs. Reject
 * protocol-relative URLs, backslashes, control characters, and characters
 * that can break out of an HTML attribute.
 */
export function safeAssetUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;

  const url = value.trim();
  if (!url || hasControlCharacter(url) || /[<>"'`\\\s]/.test(url)) return null;

  if (url.startsWith('/')) {
    return url.startsWith('//') ? null : url;
  }

  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    return url;
  } catch {
    return null;
  }
}

export function registerZodykFilters(engine: Liquid, locales: Record<string, string> = {}): void {
  engine.registerFilter('asset_url', (value: string) => `/assets/${value}`);
  engine.registerFilter('stylesheet_tag', (url: string) => {
    const safeUrl = safeAssetUrl(url);
    return safeUrl
      ? `<link rel="stylesheet" href="${escapeHtmlAttribute(safeUrl)}">`
      : '';
  });
  engine.registerFilter('script_tag', (url: string) => {
    const safeUrl = safeAssetUrl(url);
    return safeUrl ? `<script src="${escapeHtmlAttribute(safeUrl)}" defer></script>` : '';
  });
  engine.registerFilter('image_url', (value: unknown) => {
    if (!value) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'object' && value !== null && 'url' in value) {
      return String((value as { url: string }).url);
    }
    return '';
  });
  engine.registerFilter('handleize', (value: string) =>
    String(value)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, ''),
  );
  engine.registerFilter('json', (value: unknown) => JSON.stringify(value));
  engine.registerFilter('t', (key: string) => locales[key] ?? key);
  engine.registerFilter('default', (value: unknown, defaultValue: unknown) =>
    value == null || value === '' ? defaultValue : value,
  );
  engine.registerFilter('zodyk_block_attributes', (block: Record<string, unknown>, sectionId?: string) => {
    if (!block || typeof block !== 'object') return '';
    const id = block.id ?? block.blockId;
    if (!id) return '';
    const sid = sectionId ?? block.section_id ?? block.sectionId;
    const attrs = [
      `class="zodyk-block"`,
      `data-block-id="${escapeHtmlAttribute(id)}"`,
    ];
    if (sid) attrs.push(`data-section-id="${escapeHtmlAttribute(sid)}"`);
    return attrs.join(' ');
  });
}

export function resolveDynamicValue(
  value: unknown,
  context: Record<string, unknown>,
): unknown {
  if (!value || typeof value !== 'object') return value;
  const dynamic = value as DynamicSourceValue;
  if (!('source' in dynamic)) return value;

  switch (dynamic.source) {
    case 'static':
      return dynamic.value;
    case 'page': {
      const page = context.page as Record<string, unknown> | undefined;
      return getNestedValue(page, dynamic.field);
    }
    case 'metaobject': {
      const metaobject = context.metaobject as Record<string, unknown> | undefined;
      return getNestedValue(metaobject, dynamic.field);
    }
    case 'settings': {
      const settings = context.settings as Record<string, unknown> | undefined;
      return getNestedValue(settings, dynamic.field);
    }
    default:
      return value;
  }
}

function getNestedValue(obj: Record<string, unknown> | undefined, path: string): unknown {
  if (!obj) return undefined;
  const parts = path.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

export function resolveDynamicSettings(
  settings: Record<string, unknown>,
  context: Record<string, unknown>,
): Record<string, unknown> {
  const resolved: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(settings)) {
    resolved[key] = resolveDynamicValue(value, context);
  }
  return resolved;
}

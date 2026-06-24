import type { Liquid } from 'liquidjs';
import type { DynamicSourceValue } from '@zodyk/core';

export function registerZodykFilters(engine: Liquid, locales: Record<string, string> = {}): void {
  engine.registerFilter('asset_url', (value: string) => `/assets/${value}`);
  engine.registerFilter('stylesheet_tag', (url: string) =>
    `<link rel="stylesheet" href="${url}">`,
  );
  engine.registerFilter('script_tag', (url: string) =>
    `<script src="${url}" defer></script>`,
  );
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

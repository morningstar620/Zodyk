export interface SeoFields {
  metaTitle?: string;
  metaDescription?: string;
  canonicalUrl?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  twitterCard?: string;
  robots?: string;
  schemaOrg?: unknown;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  return value as Record<string, unknown>;
}

function asString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

/** Read SEO fields from a page `seo` object or a meta entry `data` / `data.seo` blob. */
export function readSeoFields(source: unknown): SeoFields {
  const record = asRecord(source);
  if (!record) return {};
  const nested = asRecord(record.seo) ?? record;
  let schemaOrg = nested.schemaOrg;
  if (typeof schemaOrg === 'string') {
    const trimmed = schemaOrg.trim();
    if (!trimmed) {
      schemaOrg = undefined;
    } else {
      try {
        schemaOrg = JSON.parse(trimmed) as unknown;
      } catch {
        schemaOrg = undefined;
      }
    }
  }

  return {
    metaTitle: asString(nested.metaTitle),
    metaDescription: asString(nested.metaDescription),
    canonicalUrl: asString(nested.canonicalUrl),
    ogTitle: asString(nested.ogTitle),
    ogDescription: asString(nested.ogDescription),
    ogImage: asString(nested.ogImage),
    twitterCard: asString(nested.twitterCard),
    robots: asString(nested.robots),
    schemaOrg,
  };
}

export function isNoIndex(robots: string | undefined): boolean {
  if (!robots) return false;
  return robots
    .toLowerCase()
    .split(/[\s,]+/)
    .filter(Boolean)
    .includes('noindex');
}

export function textField(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

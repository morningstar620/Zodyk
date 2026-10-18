import type { PageSeo, PageStatus } from './page';

export const PAGE_SNAPSHOT_FIELDS = [
  'title',
  'slug',
  'handle',
  'parentId',
  'templateSuffix',
  'body',
  'seo',
  'status',
  'publishedAt',
  'scheduledAt',
] as const;

export const META_ENTRY_SNAPSHOT_FIELDS = [
  'handle',
  'templateSuffix',
  'status',
  'locale',
  'data',
  'translations',
  'publishedAt',
  'scheduledAt',
] as const;

export type PageSnapshot = {
  title: string;
  slug: string;
  handle: string;
  parentId: string | null;
  templateSuffix: string | null;
  body: string;
  seo: PageSeo;
  status: string;
  publishedAt: string | null;
  scheduledAt: string | null;
};

export type MetaEntrySnapshot = {
  handle: string;
  templateSuffix: string | null;
  status: string;
  locale: string;
  data: Record<string, unknown>;
  translations: Record<string, Record<string, unknown>>;
  publishedAt: string | null;
  scheduledAt: string | null;
};

function iso(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function parentIdOf(parent: { toString(): string } | string | null | undefined): string | null {
  if (!parent) return null;
  return typeof parent === 'string' ? parent : parent.toString();
}

function copySeo(seo: PageSeo | null | undefined): PageSeo {
  if (!seo) return {};
  const next: PageSeo = {};
  if (seo.metaTitle) next.metaTitle = seo.metaTitle;
  if (seo.metaDescription) next.metaDescription = seo.metaDescription;
  if (seo.ogTitle) next.ogTitle = seo.ogTitle;
  if (seo.ogDescription) next.ogDescription = seo.ogDescription;
  if (seo.ogImage) next.ogImage = seo.ogImage;
  if (seo.canonicalUrl) next.canonicalUrl = seo.canonicalUrl;
  if (seo.twitterCard) next.twitterCard = seo.twitterCard;
  if (seo.robots) next.robots = seo.robots;
  return next;
}

export function snapshotPageContent(page: {
  title: string;
  slug: string;
  handle: string;
  parentId?: { toString(): string } | string | null;
  templateSuffix?: string | null;
  body?: string | null;
  seo?: PageSeo | null;
  status: PageStatus | string;
  publishedAt?: Date | string | null;
  scheduledAt?: Date | string | null;
}): PageSnapshot {
  return {
    title: page.title,
    slug: page.slug,
    handle: page.handle,
    parentId: parentIdOf(page.parentId),
    templateSuffix: page.templateSuffix ?? null,
    body: page.body ?? '',
    seo: copySeo(page.seo),
    status: page.status,
    publishedAt: iso(page.publishedAt),
    scheduledAt: iso(page.scheduledAt),
  };
}

export function snapshotMetaEntryContent(entry: {
  handle: string;
  templateSuffix?: string | null;
  status: string;
  locale: string;
  data?: Record<string, unknown> | null;
  translations?: Record<string, Record<string, unknown>> | null;
  publishedAt?: Date | string | null;
  scheduledAt?: Date | string | null;
}): MetaEntrySnapshot {
  return {
    handle: entry.handle,
    templateSuffix: entry.templateSuffix ?? null,
    status: entry.status,
    locale: entry.locale,
    data: entry.data ?? {},
    translations: entry.translations ?? {},
    publishedAt: iso(entry.publishedAt),
    scheduledAt: iso(entry.scheduledAt),
  };
}

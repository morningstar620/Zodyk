import type { PageSeo } from '@zodyk/core';

export type PageFormData = {
  title: string;
  slug: string;
  templateSuffix?: string;
  body: string;
  seo: PageSeo;
  visible: boolean;
  publishedAt?: string;
};

export type PageRecord = PageFormData & {
  id: string;
  handle: string;
  status: string;
  createdAt?: string;
  updatedAt?: string;
};

export function slugFromTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function normalizeSlugInput(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-{2,}/g, '-');
}

export function pageToFormData(page: PageRecord): PageFormData {
  return {
    title: page.title,
    slug: page.slug,
    templateSuffix: page.templateSuffix,
    body: page.body ?? '',
    seo: page.seo ?? {},
    visible: page.status === 'published',
    publishedAt: page.publishedAt,
  };
}

export function defaultPageFormData(): PageFormData {
  return {
    title: '',
    slug: '',
    templateSuffix: undefined,
    body: '',
    seo: {},
    visible: false,
  };
}

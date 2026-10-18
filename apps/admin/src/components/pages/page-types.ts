import type { PageSeo, PageStatus } from '@zodyk/core';

export type PageOption = {
  id: string;
  title: string;
  slug: string;
  parentId?: string | null;
  status: string;
  path: string;
};

export type PageFormData = {
  title: string;
  slug: string;
  templateSuffix?: string;
  body: string;
  seo: PageSeo;
  visible: boolean;
  publishedAt?: string;
  parentId?: string | null;
  status?: PageStatus;
};

export type PageRecord = {
  id: string;
  title: string;
  slug: string;
  handle: string;
  templateSuffix?: string;
  body?: string;
  seo: PageSeo;
  status: string;
  publishedAt?: string;
  scheduledAt?: string;
  parentId?: string | null;
  path?: string;
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
  const scheduled = page.status === 'scheduled';
  return {
    title: page.title,
    slug: page.slug,
    templateSuffix: page.templateSuffix,
    body: page.body ?? '',
    seo: page.seo ?? {},
    visible: page.status === 'published' || scheduled,
    publishedAt: scheduled ? (page.scheduledAt ?? page.publishedAt) : page.publishedAt,
    parentId: page.parentId ?? null,
    status: page.status as PageStatus,
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
    parentId: null,
    status: 'draft',
  };
}

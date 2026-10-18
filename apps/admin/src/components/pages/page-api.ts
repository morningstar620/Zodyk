import { resolvePagePublication } from '@zodyk/core';
import type { PageFormData } from './page-types';

export function buildPagePayload(form: PageFormData) {
  const publication = resolvePagePublication({
    visible: form.visible,
    publishedAt: form.publishedAt,
    archived: !form.visible && form.status === 'archived',
  });

  return {
    title: form.title,
    slug: form.slug || undefined,
    templateSuffix: form.templateSuffix ? form.templateSuffix : null,
    body: form.body,
    seo: form.seo,
    parentId: form.parentId ? form.parentId : null,
    status: publication.status,
    ...(publication.publishedAt !== undefined ? { publishedAt: publication.publishedAt } : {}),
    scheduledAt: publication.scheduledAt,
  };
}

export async function savePage(
  id: string | null,
  form: PageFormData,
): Promise<Record<string, unknown>> {
  const payload = buildPagePayload(form);

  if (!id) {
    const res = await fetch('/api/v1/pages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...payload,
        slug: form.slug || form.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? 'Failed to create page');
    return data;
  }

  const res = await fetch(`/api/v1/pages/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? 'Failed to save page');
  return data;
}

import type { PageFormData } from './page-types';

export function buildPagePayload(form: PageFormData) {
  return {
    title: form.title,
    slug: form.slug || undefined,
    templateSuffix: form.templateSuffix,
    body: form.body,
    seo: form.seo,
    status: form.visible ? ('published' as const) : ('draft' as const),
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
        status: form.visible ? 'published' : 'draft',
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? 'Failed to create page');
    if (form.visible && data.id) {
      const pub = await fetch(`/api/v1/pages/${data.id}/publish`, { method: 'POST' });
      if (pub.ok) return pub.json();
    }
    return data;
  }

  const res = await fetch(`/api/v1/pages/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? 'Failed to save page');

  if (form.visible && data.status !== 'published') {
    const pub = await fetch(`/api/v1/pages/${id}/publish`, { method: 'POST' });
    if (pub.ok) return pub.json();
  }

  return data;
}

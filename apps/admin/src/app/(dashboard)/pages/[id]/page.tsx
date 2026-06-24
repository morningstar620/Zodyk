'use client';

import { Badge, Button, Input, Label } from '@zodyk/shared-ui';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface PageData {
  id: string;
  title: string;
  slug: string;
  templateSuffix?: string;
  isHomepage: boolean;
  body?: string;
  status: string;
}

export default function EditPagePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [page, setPage] = useState<PageData | null>(null);
  const [templates, setTemplates] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      fetch(`/api/v1/pages/${id}`).then((r) => r.json()),
      fetch('/api/v1/themes/templates').then((r) => r.json()),
    ]).then(([pageData, templateData]) => {
      setPage(pageData);
      setTemplates(templateData.pageTemplates ?? []);
    });
  }, [id]);

  async function save(updates: Partial<PageData>) {
    setSaving(true);
    setError('');
    const res = await fetch(`/api/v1/pages/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error ?? 'Failed to save');
      return;
    }
    setPage(data);
  }

  async function publish() {
    const res = await fetch(`/api/v1/pages/${id}/publish`, { method: 'POST' });
    const data = await res.json();
    if (res.ok) setPage(data);
  }

  if (!page) return <p className="text-zinc-600">Loading…</p>;

  return (
    <div className="mx-auto max-w-xl flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Edit page</h1>
          <Badge variant={page.status === 'published' ? 'success' : 'secondary'}>{page.status}</Badge>
        </div>
        <Link href="/pages" className="text-sm text-zinc-600 hover:underline">
          Back
        </Link>
      </div>

      <div className="flex flex-col gap-4">
        <div>
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            value={page.title}
            onChange={(e) => setPage({ ...page, title: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="slug">Slug</Label>
          <Input
            id="slug"
            value={page.slug}
            onChange={(e) => setPage({ ...page, slug: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="template">Theme template</Label>
          <select
            id="template"
            className="w-full rounded-md border border-zinc-200 px-3 py-2 text-sm"
            value={page.templateSuffix ?? ''}
            onChange={(e) => setPage({ ...page, templateSuffix: e.target.value || undefined })}
          >
            <option value="">Default (page.json)</option>
            {templates.map((t) => (
              <option key={t} value={t}>
                page.{t}.json
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="body">Body</Label>
          <textarea
            id="body"
            className="min-h-32 w-full rounded-md border border-zinc-200 px-3 py-2 text-sm"
            value={page.body ?? ''}
            onChange={(e) => setPage({ ...page, body: e.target.value })}
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={page.isHomepage}
            onChange={(e) => setPage({ ...page, isHomepage: e.target.checked })}
          />
          Homepage
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-2">
          <Button
            disabled={saving}
            onClick={() =>
              save({
                title: page.title,
                slug: page.slug,
                templateSuffix: page.templateSuffix,
                isHomepage: page.isHomepage,
                body: page.body,
              })
            }
          >
            {saving ? 'Saving…' : 'Save'}
          </Button>
          {page.status !== 'published' && (
            <Button variant="outline" onClick={publish}>
              Publish
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

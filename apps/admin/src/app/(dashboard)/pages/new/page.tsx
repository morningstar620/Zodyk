'use client';

import { Button, Input, Label } from '@zodyk/shared-ui';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function NewPagePage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [templateSuffix, setTemplateSuffix] = useState('');
  const [templates, setTemplates] = useState<string[]>([]);
  const [isHomepage, setIsHomepage] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/v1/themes/templates')
      .then((r) => r.json())
      .then((data) => setTemplates(data.pageTemplates ?? []))
      .catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    const res = await fetch('/api/v1/pages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        slug: slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        templateSuffix: templateSuffix || undefined,
        isHomepage,
        status: 'draft',
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error ?? 'Failed to create page');
      return;
    }
    router.push(`/pages/${data.id}`);
  }

  return (
    <div className="mx-auto max-w-xl flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Create page</h1>
        <p className="text-zinc-600">Add a new CMS page</p>
      </div>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <Label htmlFor="title">Title</Label>
          <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
        </div>
        <div>
          <Label htmlFor="slug">Slug</Label>
          <Input
            id="slug"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="auto-generated from title"
          />
        </div>
        <div>
          <Label htmlFor="template">Theme template</Label>
          <select
            id="template"
            className="w-full rounded-md border border-zinc-200 px-3 py-2 text-sm"
            value={templateSuffix}
            onChange={(e) => setTemplateSuffix(e.target.value)}
          >
            <option value="">Default (page.json)</option>
            {templates.map((t) => (
              <option key={t} value={t}>
                page.{t}.json
              </option>
            ))}
          </select>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={isHomepage}
            onChange={(e) => setIsHomepage(e.target.checked)}
          />
          Set as homepage
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit" disabled={saving}>
          {saving ? 'Creating…' : 'Create page'}
        </Button>
      </form>
    </div>
  );
}

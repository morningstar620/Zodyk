'use client';

import { Alert, Button, Card, CardContent, CardHeader, CardTitle, Input, Label } from '@zodyk/shared-ui';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { slugify } from '@/components/content/utils';

export default function NewMetaObjectPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const res = await fetch('/api/v1/meta-objects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        slug: slug || slugify(name),
        description,
        fieldGroups: [{ key: 'content', label: 'Content', order: 0 }],
        fields: [],
      }),
    });

    if (!res.ok) {
      const json = await res.json();
      setError(json.error ?? 'Failed to create meta object');
      setSaving(false);
      return;
    }

    const created = await res.json();
    router.push(`/meta-objects/${created.slug}`);
  }

  return (
    <div className="max-w-lg">
      <h1 className="mb-6 text-2xl font-semibold text-zinc-900">Create meta object</h1>
      <Card>
        <CardHeader>
          <CardTitle>Type details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            {error && <Alert variant="destructive">{error}</Alert>}
            <div>
              <Label>Name</Label>
              <Input
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (!slug) setSlug(slugify(e.target.value));
                }}
                required
              />
            </div>
            <div>
              <Label>Slug</Label>
              <Input value={slug} onChange={(e) => setSlug(slugify(e.target.value))} required />
            </div>
            <div>
              <Label>Description</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <p className="text-sm text-zinc-500">
              A default SEO field group will be added automatically.
            </p>
            <div className="flex gap-2">
              <Button type="submit" disabled={saving}>
                Create
              </Button>
              <Link href="/meta-objects">
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

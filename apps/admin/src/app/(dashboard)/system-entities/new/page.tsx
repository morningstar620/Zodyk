'use client';

import { Alert, Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Select } from '@zodyk/shared-ui';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { slugify } from '@/components/content/utils';
import { PageBreadcrumbs } from '@/components/meta-objects/page-breadcrumbs';
import { createSystemEntity } from '@/components/system-entities/system-entities-api';

export default function NewSystemEntityPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [singularLabel, setSingularLabel] = useState('');
  const [pluralLabel, setPluralLabel] = useState('');
  const [systemCategory, setSystemCategory] = useState('');
  const [defaultView, setDefaultView] = useState<'table' | 'list' | 'card'>('table');
  const [color, setColor] = useState('#6366f1');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const created = await createSystemEntity({
        name,
        slug: slug || slugify(name),
        description,
        singularLabel: singularLabel || name,
        pluralLabel: pluralLabel || `${name}s`,
        systemCategory: systemCategory || undefined,
        defaultView,
        color,
        enabled: true,
        fieldGroups: [{ key: 'content', label: 'Content', isSystem: false, order: 0 }],
        fields: [],
      });
      router.push(`/system-entities/${created.slug}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create system entity');
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg">
      <PageBreadcrumbs
        items={[
          { label: 'Administration', href: '/system-entities' },
          { label: 'System Entities', href: '/system-entities' },
          { label: 'New entity' },
        ]}
        className="mb-2"
      />
      <h1 className="mb-6 text-2xl font-semibold text-foreground">Create system entity</h1>
      <Card>
        <CardHeader>
          <CardTitle>Entity details</CardTitle>
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
                  if (!singularLabel) setSingularLabel(e.target.value);
                }}
                required
              />
            </div>
            <div>
              <Label>Slug</Label>
              <Input value={slug} onChange={(e) => setSlug(slugify(e.target.value))} required />
            </div>
            <div>
              <Label>Singular label</Label>
              <Input value={singularLabel} onChange={(e) => setSingularLabel(e.target.value)} />
            </div>
            <div>
              <Label>Plural label</Label>
              <Input value={pluralLabel} onChange={(e) => setPluralLabel(e.target.value)} />
            </div>
            <div>
              <Label>Description</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div>
              <Label>System category</Label>
              <Input
                value={systemCategory}
                onChange={(e) => setSystemCategory(e.target.value)}
                placeholder="operations, sales, support…"
              />
            </div>
            <div>
              <Label>Default view</Label>
              <Select
                value={defaultView}
                onChange={(e) => setDefaultView(e.target.value as 'table' | 'list' | 'card')}
              >
                <option value="table">Table</option>
                <option value="list">List</option>
                <option value="card">Card</option>
              </Select>
            </div>
            <div>
              <Label>Color</Label>
              <Input type="color" value={color} onChange={(e) => setColor(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={saving}>
                Create entity
              </Button>
              <Link href="/system-entities">
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

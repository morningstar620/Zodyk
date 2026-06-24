'use client';

import type { MetaFieldDefinition, MetaFieldGroup } from '@zodyk/core';
import { Alert, Button, Input, Label } from '@zodyk/shared-ui';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { FieldBuilder } from '@/components/content/FieldBuilder';
import { FieldGroupEditor } from '@/components/content/FieldGroupEditor';
import { MetaSchemaSkeleton } from '@/components/skeletons';

interface RoutingConfig {
  archiveEnabled: boolean;
  archivePath?: string;
  singlePath?: string;
  handleField: string;
}

interface TemplatesConfig {
  templateKey?: string;
}

export default function EditMetaObjectPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;

  const [name, setName] = useState('');
  const [fieldGroups, setFieldGroups] = useState<MetaFieldGroup[]>([]);
  const [fields, setFields] = useState<MetaFieldDefinition[]>([]);
  const [routing, setRouting] = useState<RoutingConfig>({
    archiveEnabled: true,
    archivePath: slug,
    singlePath: `${slug}/:handle`,
    handleField: 'handle',
  });
  const [templates, setTemplates] = useState<TemplatesConfig>({ templateKey: slug });
  const [allTypes, setAllTypes] = useState<{ slug: string; name: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`/api/v1/meta-objects/${slug}`).then((r) => r.json()),
      fetch('/api/v1/meta-objects').then((r) => r.json()),
    ])
      .then(([item, types]) => {
        setName(item.name);
        setFieldGroups(item.fieldGroups ?? []);
        setFields(item.fields ?? []);
        if (item.routing) setRouting(item.routing);
        if (item.templates) setTemplates(item.templates);
        setAllTypes(
          (Array.isArray(types) ? types : []).map((t: { slug: string; name: string }) => ({
            slug: t.slug,
            name: t.name,
          })),
        );
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [slug]);

  async function save() {
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/v1/meta-objects/${slug}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fieldGroups, fields, routing, templates }),
    });
    if (!res.ok) {
      const json = await res.json();
      setError(json.error ?? 'Failed to save');
      setSaving(false);
      return;
    }
    setSaving(false);
  }

  if (loading) return <MetaSchemaSkeleton />;

  const userGroups = fieldGroups
    .filter((g) => !g.isSystem)
    .sort((a, b) => a.order - b.order);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">{name}</h1>
          <p className="text-zinc-600">Edit schema for {slug}</p>
        </div>
        <div className="flex gap-2">
          <Link href={`/meta-objects/${slug}/entries`}>
            <Button variant="outline">View entries</Button>
          </Link>
          <Button onClick={save} disabled={saving}>
            Save schema
          </Button>
        </div>
      </div>

      {error && <Alert variant="destructive">{error}</Alert>}

      <section className="flex flex-col gap-4 rounded-lg border border-zinc-200 p-4">
        <h2 className="text-lg font-medium">Theme templates & routing</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="templateKey">Template key</Label>
            <Input
              id="templateKey"
              value={templates.templateKey ?? ''}
              onChange={(e) => setTemplates({ ...templates, templateKey: e.target.value })}
              placeholder={slug}
            />
            <p className="mt-1 text-xs text-zinc-500">
              Maps to templates/{'{templateKey}'}.archive.json and .single.json
            </p>
          </div>
          <div>
            <Label htmlFor="archivePath">Archive path</Label>
            <Input
              id="archivePath"
              value={routing.archivePath ?? ''}
              onChange={(e) => setRouting({ ...routing, archivePath: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="singlePath">Single path pattern</Label>
            <Input
              id="singlePath"
              value={routing.singlePath ?? ''}
              onChange={(e) => setRouting({ ...routing, singlePath: e.target.value })}
            />
          </div>
          <label className="flex items-center gap-2 text-sm md:col-span-2">
            <input
              type="checkbox"
              checked={routing.archiveEnabled}
              onChange={(e) => setRouting({ ...routing, archiveEnabled: e.target.checked })}
            />
            Enable archive template
          </label>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-medium">Field groups</h2>
        <FieldGroupEditor groups={fieldGroups} onChange={setFieldGroups} />
      </section>

      {userGroups.map((group) => (
        <section key={group.key} className="flex flex-col gap-4">
          <h2 className="text-lg font-medium">{group.label} fields</h2>
          <FieldBuilder
            groupKey={group.key}
            fields={fields}
            onChange={setFields}
            metaObjectSlugs={allTypes.filter((t) => t.slug !== slug)}
          />
        </section>
      ))}

      <Link href="/meta-objects" className="text-sm text-zinc-600 hover:underline">
        Back to meta objects
      </Link>
    </div>
  );
}

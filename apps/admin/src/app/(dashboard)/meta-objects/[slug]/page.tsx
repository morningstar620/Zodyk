'use client';

import type { MetaFieldDefinition, MetaFieldGroup } from '@zodyk/core';
import { Alert, Button } from '@zodyk/shared-ui';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ApiEndpointsCard } from '@/components/meta-objects/api-endpoints-card';
import { MetaFieldsList } from '@/components/meta-objects/meta-fields-list';
import { ObjectSettingsCard } from '@/components/meta-objects/object-settings-card';
import { PageBreadcrumbs } from '@/components/meta-objects/page-breadcrumbs';
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
  const [status, setStatus] = useState('active');
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
        setStatus(item.status ?? 'active');
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
      body: JSON.stringify({
        name,
        status,
        fieldGroups,
        fields,
        routing,
        templates,
      }),
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

  const contentGroup = fieldGroups.find((g) => g.key === 'content') ?? fieldGroups[0];
  const userFieldCount = fields.filter((f) => !f.isSystem).length;

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <PageBreadcrumbs
            items={[
              { label: 'Content', href: '/meta-objects' },
              { label: 'Meta Objects', href: '/meta-objects' },
              { label: name },
            ]}
            className="mb-2"
          />
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Schema and configuration · {userFieldCount} fields
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Link
            href={`/meta-objects/${slug}/entries`}
            className="inline-flex h-10 items-center justify-center rounded-md border border-border bg-card px-4 text-sm font-medium transition-colors hover:bg-muted"
          >
            View entries
          </Link>
          <Button onClick={save} disabled={saving}>
            Save schema
          </Button>
        </div>
      </div>

      {error && <Alert variant="destructive">{error}</Alert>}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {contentGroup && (
            <MetaFieldsList
              groupKey={contentGroup.key}
              fields={fields}
              onChange={setFields}
              metaObjectSlugs={allTypes.filter((t) => t.slug !== slug)}
            />
          )}
        </div>

        <div className="space-y-4">
          <ObjectSettingsCard
            name={name}
            slug={slug}
            publicApi={status === 'active'}
            onNameChange={setName}
            onPublicApiChange={(enabled) => setStatus(enabled ? 'active' : 'draft')}
          />
          <ApiEndpointsCard slug={slug} />
        </div>
      </div>
    </div>
  );
}

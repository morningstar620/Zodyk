'use client';

import type { MetaFieldDefinition, MetaFieldGroup } from '@zodyk/core';
import { Alert, Button } from '@zodyk/shared-ui';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { MetaEntryForm } from '@/components/content/MetaEntryForm';
import { entryLabel } from '@/components/meta-objects/entries-table';
import { EntrySidebar } from '@/components/meta-objects/entry-sidebar';
import { PageBreadcrumbs } from '@/components/meta-objects/page-breadcrumbs';
import { MetaEntryFormSkeleton } from '@/components/skeletons';

export default function EditMetaEntryPage() {
  const params = useParams<{ slug: string; id: string }>();
  const { slug, id } = params;

  const [typeName, setTypeName] = useState(slug);
  const [fieldGroups, setFieldGroups] = useState<MetaFieldGroup[]>([]);
  const [fields, setFields] = useState<MetaFieldDefinition[]>([]);
  const [data, setData] = useState<Record<string, unknown>>({});
  const [translations, setTranslations] = useState<Record<string, Record<string, unknown>>>({});
  const [status, setStatus] = useState('draft');
  const [handle, setHandle] = useState<string>();
  const [createdAt, setCreatedAt] = useState<string>();
  const [updatedAt, setUpdatedAt] = useState<string>();
  const [activeLocale, setActiveLocale] = useState('en');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [metaObjects, setMetaObjects] = useState<{ slug: string; name: string }[]>([]);

  useEffect(() => {
    Promise.all([
      fetch(`/api/v1/meta-objects/${slug}`).then((r) => r.json()),
      fetch(`/api/v1/meta-objects/${slug}/entries/${id}`).then((r) => r.json()),
      fetch('/api/v1/meta-objects').then((r) => r.json()),
    ]).then(([type, entry, types]) => {
      setTypeName(type.name ?? slug);
      setFieldGroups(type.fieldGroups ?? []);
      setFields(type.fields ?? []);
      setData(entry.data ?? {});
      setTranslations(entry.translations ?? {});
      setStatus(entry.status ?? 'draft');
      setHandle(entry.handle);
      setCreatedAt(entry.createdAt);
      setUpdatedAt(entry.updatedAt);
      setMetaObjects(
        (Array.isArray(types) ? types : []).map((t: { slug: string; name: string }) => ({
          slug: t.slug,
          name: t.name,
        })),
      );
      setLoading(false);
    });
  }, [slug, id]);

  async function save() {
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/v1/meta-objects/${slug}/entries/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data, translations }),
    });
    if (!res.ok) {
      const json = await res.json();
      setError(json.error ?? 'Failed to save');
      setSaving(false);
      return;
    }
    const result = await res.json();
    setUpdatedAt(result.updatedAt ?? new Date().toISOString());
    setSaving(false);
  }

  async function publish() {
    setSaving(true);
    setError(null);
    await save();
    const res = await fetch(`/api/v1/meta-objects/${slug}/entries/${id}/publish`, { method: 'POST' });
    if (!res.ok) {
      const json = await res.json();
      setError(json.error ?? 'Failed to publish');
      setSaving(false);
      return;
    }
    const result = await res.json();
    setStatus(result.status);
    setSaving(false);
  }

  if (loading) return <MetaEntryFormSkeleton />;

  const title = entryLabel(data);

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <PageBreadcrumbs
            items={[
              { label: 'Content', href: '/meta-objects' },
              { label: 'Meta Objects', href: '/meta-objects' },
              { label: typeName, href: `/meta-objects/${slug}` },
              { label: 'Entries', href: `/meta-objects/${slug}/entries` },
              { label: title },
            ]}
            className="mb-2"
          />
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Edit entry for {typeName}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button variant="outline" onClick={save} disabled={saving}>
            Save draft
          </Button>
          <Button onClick={publish} disabled={saving}>
            Publish
          </Button>
        </div>
      </div>

      {error && <Alert variant="destructive">{error}</Alert>}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <MetaEntryForm
            fieldGroups={fieldGroups}
            fields={fields}
            data={data}
            translations={translations}
            defaultLocale="en"
            activeLocale={activeLocale}
            onLocaleChange={setActiveLocale}
            onChange={(d, t) => {
              setData(d);
              setTranslations(t);
            }}
            metaObjects={metaObjects}
          />
        </div>
        <EntrySidebar
          status={status}
          handle={handle}
          createdAt={createdAt}
          updatedAt={updatedAt}
        />
      </div>

      <Link
        href={`/meta-objects/${slug}/entries`}
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        ← Back to entries
      </Link>
    </div>
  );
}

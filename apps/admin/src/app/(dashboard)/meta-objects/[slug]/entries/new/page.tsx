'use client';

import type { MetaFieldDefinition, MetaFieldGroup } from '@zodyk/core';
import { Alert, Button } from '@zodyk/shared-ui';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { MetaEntryForm } from '@/components/content/MetaEntryForm';
import { PageBreadcrumbs } from '@/components/meta-objects/page-breadcrumbs';
import { MetaEntryFormSkeleton } from '@/components/skeletons';

export default function NewMetaEntryPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const router = useRouter();

  const [typeName, setTypeName] = useState(slug);
  const [fieldGroups, setFieldGroups] = useState<MetaFieldGroup[]>([]);
  const [fields, setFields] = useState<MetaFieldDefinition[]>([]);
  const [data, setData] = useState<Record<string, unknown>>({});
  const [translations, setTranslations] = useState<Record<string, Record<string, unknown>>>({});
  const [activeLocale, setActiveLocale] = useState('en');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [metaObjects, setMetaObjects] = useState<{ slug: string; name: string }[]>([]);

  useEffect(() => {
    Promise.all([
      fetch(`/api/v1/meta-objects/${slug}`).then((r) => r.json()),
      fetch('/api/v1/meta-objects').then((r) => r.json()),
    ]).then(([type, types]) => {
      setTypeName(type.name ?? slug);
      setFieldGroups(type.fieldGroups ?? []);
      setFields(type.fields ?? []);
      setMetaObjects(
        (Array.isArray(types) ? types : []).map((t: { slug: string; name: string }) => ({
          slug: t.slug,
          name: t.name,
        })),
      );
      setLoading(false);
    });
  }, [slug]);

  async function save(status: 'draft' | 'published') {
    setSaving(true);
    setError(null);

    const res = await fetch(`/api/v1/meta-objects/${slug}/entries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status,
        locale: 'en',
        data,
        translations,
      }),
    });

    if (!res.ok) {
      const json = await res.json();
      setError(json.error ?? 'Failed to create entry');
      setSaving(false);
      return;
    }

    const created = await res.json();
    if (status === 'published') {
      await fetch(`/api/v1/meta-objects/${slug}/entries/${created.id}/publish`, { method: 'POST' });
    }
    router.push(`/meta-objects/${slug}/entries/${created.id}`);
  }

  if (loading) return <MetaEntryFormSkeleton />;

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
              { label: 'New entry' },
            ]}
            className="mb-2"
          />
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">New entry</h1>
          <p className="mt-1 text-sm text-muted-foreground">Create a new {typeName} entry</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button variant="outline" onClick={() => save('draft')} disabled={saving}>
            Save draft
          </Button>
          <Button onClick={() => save('published')} disabled={saving}>
            Publish
          </Button>
        </div>
      </div>

      {error && <Alert variant="destructive">{error}</Alert>}

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

      <Link
        href={`/meta-objects/${slug}/entries`}
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        ← Back to entries
      </Link>
    </div>
  );
}

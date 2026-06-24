'use client';

import type { MetaFieldDefinition, MetaFieldGroup } from '@zodyk/core';
import { Alert, Button } from '@zodyk/shared-ui';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { MetaEntryForm } from '@/components/content/MetaEntryForm';
import { MetaEntryFormSkeleton } from '@/components/skeletons';

export default function EditMetaEntryPage() {
  const params = useParams<{ slug: string; id: string }>();
  const { slug, id } = params;

  const [fieldGroups, setFieldGroups] = useState<MetaFieldGroup[]>([]);
  const [fields, setFields] = useState<MetaFieldDefinition[]>([]);
  const [data, setData] = useState<Record<string, unknown>>({});
  const [translations, setTranslations] = useState<Record<string, Record<string, unknown>>>({});
  const [status, setStatus] = useState('draft');
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
      setFieldGroups(type.fieldGroups ?? []);
      setFields(type.fields ?? []);
      setData(entry.data ?? {});
      setTranslations(entry.translations ?? {});
      setStatus(entry.status ?? 'draft');
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

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Edit entry</h1>
          <p className="text-sm text-zinc-500">Status: {status}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={save} disabled={saving}>
            Save
          </Button>
          <Button onClick={publish} disabled={saving}>
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

      <Link href={`/meta-objects/${slug}/entries`} className="text-sm text-zinc-600 hover:underline">
        Back to entries
      </Link>
    </div>
  );
}

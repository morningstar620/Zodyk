'use client';

import type { MetaFieldDefinition, MetaFieldGroup } from '@zodyk/core';
import { Alert, Button } from '@zodyk/shared-ui';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { MetaEntryForm } from '@/components/content/MetaEntryForm';
import type { EntityTargetOption } from '@/components/content/entity-targets';
import { useActiveContentLocale } from '@/components/content/use-content-locales';
import { RevisionHistory } from '@/components/revisions/revision-history';
import { entryLabel } from '@/components/meta-objects/entries-table';
import { EntrySidebar, type EntryEditorStatus } from '@/components/meta-objects/entry-sidebar';
import { PageBreadcrumbs } from '@/components/meta-objects/page-breadcrumbs';
import { MetaEntryFormSkeleton } from '@/components/skeletons';

export default function EditMetaEntryPage() {
  const params = useParams<{ slug: string; id: string }>();
  const router = useRouter();
  const { slug, id } = params;
  const { locales, defaultLocale, activeLocale, setActiveLocale } = useActiveContentLocale();

  const [typeName, setTypeName] = useState(slug);
  const [fieldGroups, setFieldGroups] = useState<MetaFieldGroup[]>([]);
  const [fields, setFields] = useState<MetaFieldDefinition[]>([]);
  const [data, setData] = useState<Record<string, unknown>>({});
  const [translations, setTranslations] = useState<Record<string, Record<string, unknown>>>({});
  const [status, setStatus] = useState('draft');
  const [scheduledAt, setScheduledAt] = useState<string | undefined>();
  const [handle, setHandle] = useState<string>();
  const [createdAt, setCreatedAt] = useState<string>();
  const [updatedAt, setUpdatedAt] = useState<string>();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [metaObjects, setMetaObjects] = useState<{ slug: string; name: string }[]>([]);
  const [entityTargets, setEntityTargets] = useState<EntityTargetOption[]>([]);

  useEffect(() => {
    Promise.all([
      fetch(`/api/v1/meta-objects/${slug}`).then((response) => response.json()),
      fetch(`/api/v1/meta-objects/${slug}/entries/${id}`).then((response) => response.json()),
      fetch('/api/v1/meta-objects').then((response) => response.json()),
      fetch('/api/v1/system-entities').then(async (response) =>
        response.ok ? response.json() : [],
      ),
    ]).then(([type, entry, types, systemTypes]) => {
      setTypeName(type.name ?? slug);
      setFieldGroups(type.fieldGroups ?? []);
      setFields(type.fields ?? []);
      setData(entry.data ?? {});
      setTranslations(entry.translations ?? {});
      setStatus(entry.status ?? 'draft');
      setScheduledAt(entry.scheduledAt ? new Date(entry.scheduledAt).toISOString() : undefined);
      setHandle(entry.handle);
      setCreatedAt(entry.createdAt);
      setUpdatedAt(entry.updatedAt);
      const metaTargets: EntityTargetOption[] = (Array.isArray(types) ? types : []).map(
        (item: { slug: string; name: string }) => ({
          slug: item.slug,
          name: item.name,
          category: 'meta_object' as const,
        }),
      );
      const systemTargets: EntityTargetOption[] = (
        Array.isArray(systemTypes) ? systemTypes : []
      ).map((item: { slug: string; name: string }) => ({
        slug: item.slug,
        name: item.name,
        category: 'system' as const,
      }));
      setEntityTargets([...metaTargets, ...systemTargets]);
      setMetaObjects(metaTargets.map((item) => ({ slug: item.slug, name: item.name })));
      setLoading(false);
    });
  }, [slug, id]);

  async function persistContent(): Promise<boolean> {
    const res = await fetch(`/api/v1/meta-objects/${slug}/entries/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data, translations, locale: defaultLocale }),
    });
    if (!res.ok) {
      const json = await res.json();
      setError(json.error ?? 'Failed to save');
      return false;
    }
    const result = await res.json();
    setUpdatedAt(result.updatedAt ?? new Date().toISOString());
    if (result.handle) setHandle(result.handle);
    return true;
  }

  async function save() {
    setSaving(true);
    setError(null);
    await persistContent();
    setSaving(false);
  }

  async function applyStatus(next: EntryEditorStatus) {
    setSaving(true);
    setError(null);
    const saved = await persistContent();
    if (!saved) {
      setSaving(false);
      return;
    }

    if (next === 'published' || next === 'scheduled') {
      let scheduled: string | undefined;
      if (next === 'scheduled') {
        if (!scheduledAt) {
          setError('Choose a date and time to schedule this entry');
          setSaving(false);
          return;
        }
        const when = new Date(scheduledAt);
        if (Number.isNaN(when.getTime()) || when.getTime() <= Date.now()) {
          setError('Schedule time must be in the future');
          setSaving(false);
          return;
        }
        scheduled = when.toISOString();
      }

      const res = await fetch(`/api/v1/meta-objects/${slug}/entries/${id}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(scheduled ? { scheduledAt: scheduled } : {}),
      });
      if (!res.ok) {
        const json = await res.json();
        setError(json.error ?? 'Failed to publish');
        setSaving(false);
        return;
      }
      const result = await res.json();
      setStatus(result.status ?? (scheduled ? 'scheduled' : 'published'));
      setScheduledAt(result.scheduledAt ? new Date(result.scheduledAt).toISOString() : scheduled);
      if (!scheduled) setScheduledAt(undefined);
      setSaving(false);
      return;
    }

    const res = await fetch(`/api/v1/meta-objects/${slug}/entries/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: next, scheduledAt: null }),
    });
    if (!res.ok) {
      const json = await res.json();
      setError(json.error ?? 'Failed to update status');
      setSaving(false);
      return;
    }
    const result = await res.json();
    setStatus(result.status ?? next);
    setScheduledAt(undefined);
    setUpdatedAt(result.updatedAt ?? new Date().toISOString());
    setSaving(false);
  }

  async function publish() {
    const when = scheduledAt ? new Date(scheduledAt) : null;
    const future = Boolean(when && !Number.isNaN(when.getTime()) && when.getTime() > Date.now());
    await applyStatus(future ? 'scheduled' : 'published');
  }

  async function removeEntry() {
    if (!window.confirm('Delete this entry? It will be removed from the entries list.')) return;
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/v1/meta-objects/${slug}/entries/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const json = await res.json();
      setError(json.error ?? 'Failed to delete');
      setSaving(false);
      return;
    }
    router.push(`/meta-objects/${slug}/entries`);
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
            locales={locales}
            defaultLocale={defaultLocale}
            activeLocale={activeLocale}
            onLocaleChange={setActiveLocale}
            onChange={(nextData, nextTranslations) => {
              setData(nextData);
              setTranslations(nextTranslations);
            }}
            metaObjects={metaObjects}
            entityTargets={entityTargets}
          />
        </div>
        <div className="flex flex-col gap-6">
          <EntrySidebar
            status={status}
            scheduledAt={scheduledAt}
            handle={handle}
            createdAt={createdAt}
            updatedAt={updatedAt}
            busy={saving}
            onScheduledAtChange={(value) => setScheduledAt(value ?? undefined)}
            onApplyStatus={applyStatus}
            onDelete={removeEntry}
          />
          <RevisionHistory
            listUrl={`/api/v1/meta-objects/${slug}/entries/${id}/revisions`}
            refreshKey={updatedAt}
            onRestored={async () => {
              const entry = await fetch(`/api/v1/meta-objects/${slug}/entries/${id}`).then(
                (response) => response.json(),
              );
              setData(entry.data ?? {});
              setTranslations(entry.translations ?? {});
              setStatus(entry.status ?? 'draft');
              setScheduledAt(
                entry.scheduledAt ? new Date(entry.scheduledAt).toISOString() : undefined,
              );
              setHandle(entry.handle);
              setUpdatedAt(entry.updatedAt);
            }}
          />
        </div>
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

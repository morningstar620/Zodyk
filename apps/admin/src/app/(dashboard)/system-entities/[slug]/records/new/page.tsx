'use client';

import type { MetaFieldDefinition, MetaFieldGroup } from '@zodyk/core';
import { Alert, Button, Card, CardContent, CardHeader, CardTitle, Select } from '@zodyk/shared-ui';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { MetaEntryForm } from '@/components/content/MetaEntryForm';
import { PageBreadcrumbs } from '@/components/meta-objects/page-breadcrumbs';
import {
  createSystemRecord,
  fetchEntityTargets,
  fetchSystemEntity,
} from '@/components/system-entities/system-entities-api';
import { MetaEntryFormSkeleton } from '@/components/skeletons';

export default function NewSystemRecordPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const router = useRouter();

  const [entityName, setEntityName] = useState(slug);
  const [singularLabel, setSingularLabel] = useState('Record');
  const [fieldGroups, setFieldGroups] = useState<MetaFieldGroup[]>([]);
  const [fields, setFields] = useState<MetaFieldDefinition[]>([]);
  const [data, setData] = useState<Record<string, unknown>>({});
  const [status, setStatus] = useState<'active' | 'draft'>('active');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [metaObjects, setMetaObjects] = useState<{ slug: string; name: string }[]>([]);

  useEffect(() => {
    Promise.all([fetchSystemEntity(slug), fetchEntityTargets()]).then(([entity, targets]) => {
      setEntityName(entity.name);
      setSingularLabel(entity.singularLabel);
      setFieldGroups(entity.fieldGroups ?? []);
      setFields(entity.fields ?? []);
      setMetaObjects(
        targets.map((t) => ({
          slug: t.slug,
          name: t.name,
        })),
      );
      setLoading(false);
    });
  }, [slug]);

  async function save(targetStatus: 'active' | 'draft') {
    setSaving(true);
    setError(null);
    try {
      const created = await createSystemRecord(slug, { status: targetStatus, data });
      router.push(`/system-entities/${slug}/records/${created.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create record');
      setSaving(false);
    }
  }

  if (loading) return <MetaEntryFormSkeleton />;

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <PageBreadcrumbs
            items={[
              { label: 'Administration', href: '/system-entities' },
              { label: 'System Entities', href: '/system-entities' },
              { label: entityName, href: `/system-entities/${slug}` },
              { label: 'Records', href: `/system-entities/${slug}/records` },
              { label: `New ${singularLabel.toLowerCase()}` },
            ]}
            className="mb-2"
          />
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            New {singularLabel.toLowerCase()}
          </h1>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button variant="outline" onClick={() => save('draft')} disabled={saving}>
            Save draft
          </Button>
          <Button onClick={() => save('active')} disabled={saving}>
            Save
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
            translations={{}}
            defaultLocale="en"
            activeLocale="en"
            onLocaleChange={() => {}}
            onChange={(d) => setData(d)}
            metaObjects={metaObjects}
          />
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Record settings</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={status} onChange={(e) => setStatus(e.target.value as 'active' | 'draft')}>
              <option value="active">Active</option>
              <option value="draft">Draft</option>
            </Select>
          </CardContent>
        </Card>
      </div>

      <Link
        href={`/system-entities/${slug}/records`}
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        ← Back to records
      </Link>
    </div>
  );
}

'use client';

import type { MetaFieldDefinition, MetaFieldGroup } from '@zodyk/core';
import { generateRecordLabel } from '@zodyk/core';
import { Alert, Badge, Button, Card, CardContent, CardHeader, CardTitle, Select } from '@zodyk/shared-ui';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { MetaEntryForm } from '@/components/content/MetaEntryForm';
import { PageBreadcrumbs } from '@/components/meta-objects/page-breadcrumbs';
import {
  fetchEntityTargets,
  fetchSystemEntity,
  fetchSystemRecord,
  updateSystemRecord,
} from '@/components/system-entities/system-entities-api';
import { MetaEntryFormSkeleton } from '@/components/skeletons';

export default function EditSystemRecordPage() {
  const params = useParams<{ slug: string; id: string }>();
  const { slug, id } = params;

  const [entityName, setEntityName] = useState(slug);
  const [fieldGroups, setFieldGroups] = useState<MetaFieldGroup[]>([]);
  const [fields, setFields] = useState<MetaFieldDefinition[]>([]);
  const [data, setData] = useState<Record<string, unknown>>({});
  const [status, setStatus] = useState('active');
  const [updatedAt, setUpdatedAt] = useState<string>();
  const [createdAt, setCreatedAt] = useState<string>();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [metaObjects, setMetaObjects] = useState<{ slug: string; name: string }[]>([]);

  useEffect(() => {
    Promise.all([
      fetchSystemEntity(slug),
      fetchSystemRecord(slug, id),
      fetchEntityTargets(),
    ]).then(([entity, record, targets]) => {
      setEntityName(entity.name);
      setFieldGroups(entity.fieldGroups ?? []);
      setFields(entity.fields ?? []);
      setData(record.data ?? {});
      setStatus(record.status);
      setUpdatedAt(record.updatedAt);
      setCreatedAt(record.createdAt);
      setMetaObjects(targets.map((t) => ({ slug: t.slug, name: t.name })));
      setLoading(false);
    });
  }, [slug, id]);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await updateSystemRecord(slug, id, { status: status as 'active' | 'draft' | 'archived', data });
      setSaving(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save record');
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
              { label: generateRecordLabel(data) },
            ]}
            className="mb-2"
          />
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {generateRecordLabel(data)}
          </h1>
        </div>
        <Button onClick={save} disabled={saving}>
          Save record
        </Button>
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
            <CardTitle>Record info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-xs text-muted-foreground">Status</p>
              <Select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="active">Active</option>
                <option value="draft">Draft</option>
                <option value="archived">Archived</option>
              </Select>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Current status</p>
              <Badge variant={status === 'active' ? 'success' : 'secondary'}>{status}</Badge>
            </div>
            {createdAt && (
              <div>
                <p className="text-xs text-muted-foreground">Created</p>
                <p className="text-sm">{new Date(createdAt).toLocaleString()}</p>
              </div>
            )}
            {updatedAt && (
              <div>
                <p className="text-xs text-muted-foreground">Updated</p>
                <p className="text-sm">{new Date(updatedAt).toLocaleString()}</p>
              </div>
            )}
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

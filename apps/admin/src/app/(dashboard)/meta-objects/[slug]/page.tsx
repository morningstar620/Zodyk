'use client';

import {
  SEO_GROUP_KEY,
  isMetaObjectPubliclyReadable,
  metaObjectStatusForPublicApi,
  type MetaFieldDefinition,
  type MetaFieldGroup,
} from '@zodyk/core';
import { Alert, Button, Card, CardContent, CardHeader, CardTitle } from '@zodyk/shared-ui';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { FieldGroupEditor } from '@/components/content/FieldGroupEditor';
import type { EntityTargetOption } from '@/components/content/entity-targets';
import { ApiEndpointsCard } from '@/components/meta-objects/api-endpoints-card';
import { MetaFieldsList } from '@/components/meta-objects/meta-fields-list';
import { ObjectSettingsCard } from '@/components/meta-objects/object-settings-card';
import { PageBreadcrumbs } from '@/components/meta-objects/page-breadcrumbs';
import {
  RoutingTemplatesCard,
  routingPayload,
  templatesPayload,
  type RoutingConfig,
  type TemplatesConfig,
} from '@/components/meta-objects/routing-templates-card';
import { MetaSchemaSkeleton } from '@/components/skeletons';

export default function EditMetaObjectPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;

  const [name, setName] = useState('');
  const [status, setStatus] = useState<'active' | 'archived'>('active');
  const [fieldGroups, setFieldGroups] = useState<MetaFieldGroup[]>([]);
  const [fields, setFields] = useState<MetaFieldDefinition[]>([]);
  const [routing, setRouting] = useState<RoutingConfig>({
    archiveEnabled: true,
    archivePath: slug,
    singlePath: `${slug}/:handle`,
    handleField: 'handle',
  });
  const [templates, setTemplates] = useState<TemplatesConfig>({
    templateKey: slug,
    archiveTemplateKey: '',
    singleTemplateKey: '',
  });
  const [entityTargets, setEntityTargets] = useState<EntityTargetOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`/api/v1/meta-objects/${slug}`).then((response) => response.json()),
      fetch('/api/v1/meta-objects').then((response) => response.json()),
      fetch('/api/v1/system-entities').then(async (response) =>
        response.ok ? response.json() : [],
      ),
    ])
      .then(([item, types, systemTypes]) => {
        setName(item.name);
        setStatus(metaObjectStatusForPublicApi(isMetaObjectPubliclyReadable(item.status)));
        setFieldGroups(item.fieldGroups ?? []);
        setFields(item.fields ?? []);
        if (item.routing) {
          setRouting({
            archiveEnabled: item.routing.archiveEnabled ?? true,
            archivePath: item.routing.archivePath ?? slug,
            singlePath: item.routing.singlePath ?? `${slug}/:handle`,
            handleField: item.routing.handleField ?? 'handle',
          });
        }
        if (item.templates) {
          setTemplates({
            templateKey: item.templates.templateKey ?? slug,
            archiveTemplateKey: item.templates.archiveTemplateKey ?? '',
            singleTemplateKey: item.templates.singleTemplateKey ?? '',
          });
        }
        const metaTargets: EntityTargetOption[] = (Array.isArray(types) ? types : []).map(
          (type: { slug: string; name: string }) => ({
            slug: type.slug,
            name: type.name,
            category: 'meta_object' as const,
          }),
        );
        const systemTargets: EntityTargetOption[] = (
          Array.isArray(systemTypes) ? systemTypes : []
        ).map((type: { slug: string; name: string }) => ({
          slug: type.slug,
          name: type.name,
          category: 'system' as const,
        }));
        setEntityTargets([...metaTargets, ...systemTargets]);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [slug]);

  function updateGroups(next: MetaFieldGroup[]) {
    const fallback = next.find((group) => !group.isSystem && group.key !== SEO_GROUP_KEY)?.key;
    setFieldGroups(next);
    setFields((current) =>
      current.map((field) => {
        if (field.isSystem || next.some((group) => group.key === field.group)) return field;
        return fallback ? { ...field, group: fallback } : field;
      }),
    );
  }

  async function save() {
    const nextRouting = routingPayload(routing);
    if (nextRouting.archiveEnabled && !nextRouting.archivePath) {
      setError('Archive path is required when the archive route is enabled');
      return;
    }
    if (!nextRouting.singlePath?.includes(':handle')) {
      setError('Single path must include :handle');
      return;
    }

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
        routing: nextRouting,
        templates: templatesPayload(templates),
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

  const editableGroups = fieldGroups
    .filter((group) => group.key !== SEO_GROUP_KEY)
    .sort((a, b) => a.order - b.order);
  const userFieldCount = fields.filter((field) => !field.isSystem).length;

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
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle>Field groups</CardTitle>
            </CardHeader>
            <CardContent>
              <FieldGroupEditor groups={fieldGroups} onChange={updateGroups} />
            </CardContent>
          </Card>
          {editableGroups.map((group) => (
            <MetaFieldsList
              key={group.key}
              groupKey={group.key}
              title={group.label}
              fields={fields}
              onChange={setFields}
              entityTargets={entityTargets.filter((target) => target.slug !== slug)}
            />
          ))}
        </div>

        <div className="space-y-4">
          <ObjectSettingsCard
            name={name}
            slug={slug}
            publicApi={isMetaObjectPubliclyReadable(status)}
            onNameChange={setName}
            onPublicApiChange={(enabled) => setStatus(metaObjectStatusForPublicApi(enabled))}
          />
          <RoutingTemplatesCard
            routing={routing}
            templates={templates}
            onRoutingChange={setRouting}
            onTemplatesChange={setTemplates}
          />
          <ApiEndpointsCard slug={slug} />
        </div>
      </div>
    </div>
  );
}

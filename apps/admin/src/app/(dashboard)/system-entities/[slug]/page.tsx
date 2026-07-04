'use client';

import type { EntityRelationship, MetaFieldDefinition, MetaFieldGroup } from '@zodyk/core';
import { Alert, Button } from '@zodyk/shared-ui';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { PageBreadcrumbs } from '@/components/meta-objects/page-breadcrumbs';
import { BehaviorsPanel } from '@/components/system-entities/behaviors-panel';
import { EntitySettingsCard } from '@/components/system-entities/entity-settings-card';
import { RelationshipsPanel } from '@/components/system-entities/relationships-panel';
import {
  fetchEntityTargets,
  fetchSystemEntity,
  updateSystemEntity,
} from '@/components/system-entities/system-entities-api';
import type { EntityTarget } from '@/components/system-entities/system-entity-types';
import { SystemFieldsList } from '@/components/system-entities/system-fields-list';
import { MetaSchemaSkeleton } from '@/components/skeletons';

export default function EditSystemEntityPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;

  const [name, setName] = useState('');
  const [singularLabel, setSingularLabel] = useState('');
  const [pluralLabel, setPluralLabel] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('');
  const [color, setColor] = useState('#6366f1');
  const [systemCategory, setSystemCategory] = useState('');
  const [defaultView, setDefaultView] = useState<'table' | 'list' | 'card'>('table');
  const [enabled, setEnabled] = useState(true);
  const [behaviors, setBehaviors] = useState<Record<string, boolean>>({});
  const [fieldGroups, setFieldGroups] = useState<MetaFieldGroup[]>([]);
  const [fields, setFields] = useState<MetaFieldDefinition[]>([]);
  const [relationships, setRelationships] = useState<EntityRelationship[]>([]);
  const [entityTargets, setEntityTargets] = useState<EntityTarget[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'fields' | 'behaviors' | 'relationships'>('fields');

  useEffect(() => {
    Promise.all([fetchSystemEntity(slug), fetchEntityTargets()])
      .then(([entity, targets]) => {
        setName(entity.name);
        setSingularLabel(entity.singularLabel);
        setPluralLabel(entity.pluralLabel);
        setDescription(entity.description ?? '');
        setIcon(entity.icon ?? '');
        setColor(entity.color ?? '#6366f1');
        setSystemCategory(entity.systemCategory ?? '');
        setDefaultView(entity.defaultView);
        setEnabled(entity.enabled);
        setBehaviors(entity.behaviors ?? {});
        setFieldGroups(entity.fieldGroups ?? []);
        setFields(entity.fields ?? []);
        setRelationships(entity.relationships ?? []);
        setEntityTargets(targets.filter((t) => t.slug !== slug || t.category !== 'system'));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [slug]);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await updateSystemEntity(slug, {
        name,
        singularLabel,
        pluralLabel,
        description,
        icon: icon || null,
        color: color || null,
        systemCategory: systemCategory || null,
        defaultView,
        enabled,
        behaviors,
        fieldGroups,
        fields,
        relationships,
      });
      setSaving(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
      setSaving(false);
    }
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
              { label: 'Administration', href: '/system-entities' },
              { label: 'System Entities', href: '/system-entities' },
              { label: name },
            ]}
            className="mb-2"
          />
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            System entity configuration · {userFieldCount} fields
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Link
            href={`/system-entities/${slug}/records`}
            className="inline-flex h-10 items-center justify-center rounded-md border border-border bg-card px-4 text-sm font-medium transition-colors hover:bg-muted"
          >
            View records
          </Link>
          <Button onClick={save} disabled={saving}>
            Save entity
          </Button>
        </div>
      </div>

      {error && <Alert variant="destructive">{error}</Alert>}

      <div className="flex gap-2 border-b border-border">
        {(['fields', 'behaviors', 'relationships'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`border-b-2 px-4 py-2 text-sm font-medium capitalize ${
              activeTab === tab
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {activeTab === 'fields' && contentGroup && (
            <SystemFieldsList
              groupKey={contentGroup.key}
              fields={fields}
              onChange={setFields}
              entityTargets={entityTargets}
            />
          )}
          {activeTab === 'behaviors' && (
            <BehaviorsPanel behaviors={behaviors} onChange={setBehaviors} />
          )}
          {activeTab === 'relationships' && (
            <RelationshipsPanel
              relationships={relationships}
              onChange={setRelationships}
              entityTargets={entityTargets}
              currentSlug={slug}
            />
          )}
        </div>

        <EntitySettingsCard
          name={name}
          slug={slug}
          singularLabel={singularLabel}
          pluralLabel={pluralLabel}
          description={description}
          icon={icon}
          color={color}
          systemCategory={systemCategory}
          defaultView={defaultView}
          enabled={enabled}
          onNameChange={setName}
          onSingularLabelChange={setSingularLabel}
          onPluralLabelChange={setPluralLabel}
          onDescriptionChange={setDescription}
          onIconChange={setIcon}
          onColorChange={setColor}
          onSystemCategoryChange={setSystemCategory}
          onDefaultViewChange={setDefaultView}
          onEnabledChange={setEnabled}
        />
      </div>
    </div>
  );
}

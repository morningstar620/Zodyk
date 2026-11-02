'use client';

import {
  entityReferenceKey,
  parseEntityReference,
  parseEntityReferenceKey,
  type MetaFieldDefinition,
} from '@zodyk/core';
import { Checkbox, Input, Label, Select } from '@zodyk/shared-ui';
import { useState } from 'react';
import { MediaPicker } from '@/components/media/MediaPicker';
import { ConditionalWrapper } from './ConditionalWrapper';
import type { EntityTargetOption } from './entity-targets';
import { RelationPicker } from './RelationPicker';
import { RepeaterField } from './RepeaterField';
import { RichTextField } from './RichTextField';
import { getNestedValue } from './utils';

interface DynamicFieldRendererProps {
  field: MetaFieldDefinition;
  value: unknown;
  onChange: (value: unknown) => void;
  allFields: MetaFieldDefinition[];
  formData: Record<string, unknown>;
  metaObjects?: { slug: string; name: string }[];
  entityTargets?: EntityTargetOption[];
}

export function DynamicFieldRenderer({
  field,
  value,
  onChange,
  allFields,
  formData,
  metaObjects,
  entityTargets,
}: DynamicFieldRendererProps) {
  const renderInput = () => {
    switch (field.type) {
      case 'text':
        return (
          <Input
            value={typeof value === 'string' ? value : ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.settings?.placeholder}
          />
        );
      case 'rich_text':
        return (
          <RichTextField
            value={typeof value === 'string' ? value : ''}
            onChange={onChange}
            placeholder={field.settings?.placeholder}
          />
        );
      case 'number':
        return (
          <Input
            type="number"
            value={typeof value === 'number' ? value : ''}
            onChange={(e) => onChange(e.target.value === '' ? undefined : Number(e.target.value))}
          />
        );
      case 'boolean':
        return (
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} />
            {field.label}
          </label>
        );
      case 'date':
        return (
          <Input
            type="date"
            value={typeof value === 'string' ? value : ''}
            onChange={(e) => onChange(e.target.value)}
          />
        );
      case 'datetime':
        return (
          <Input
            type="datetime-local"
            value={typeof value === 'string' ? value.slice(0, 16) : ''}
            onChange={(e) => onChange(new Date(e.target.value).toISOString())}
          />
        );
      case 'url':
        return (
          <Input
            type="url"
            value={typeof value === 'string' ? value : ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder="https://"
          />
        );
      case 'code':
        return (
          <textarea
            className="min-h-[100px] w-full rounded-md border border-zinc-200 px-3 py-2 font-mono text-sm"
            value={typeof value === 'string' ? value : ''}
            onChange={(e) => onChange(e.target.value)}
            rows={field.settings?.rows ?? 6}
          />
        );
      case 'json':
        return (
          <textarea
            className="min-h-[100px] w-full rounded-md border border-zinc-200 px-3 py-2 font-mono text-sm"
            value={value !== undefined ? JSON.stringify(value, null, 2) : ''}
            onChange={(e) => {
              try {
                onChange(JSON.parse(e.target.value));
              } catch {
                // keep typing
              }
            }}
            rows={field.settings?.rows ?? 6}
          />
        );
      case 'image':
        return (
          <MediaPicker
            mode="single"
            accept="image/*"
            value={typeof value === 'string' ? value : ''}
            onChange={onChange}
          />
        );
      case 'file':
        return (
          <MediaPicker
            mode="single"
            value={typeof value === 'string' ? value : ''}
            onChange={onChange}
          />
        );
      case 'gallery': {
        const ids = Array.isArray(value) ? value : [];
        return <MediaPicker mode="multiple" accept="image/*" value={ids} onChange={onChange} />;
      }
      case 'relation': {
        const relation = field.settings?.relation;
        if (!relation) return <p className="text-sm text-red-600">Relation not configured</p>;
        return (
          <RelationPicker
            targetSlug={relation.targetSlug}
            cardinality={relation.cardinality}
            value={value as string | string[] | undefined}
            onChange={onChange}
          />
        );
      }
      case 'repeater':
        return (
          <RepeaterField
            field={field}
            value={Array.isArray(value) ? (value as Record<string, unknown>[]) : []}
            onChange={onChange}
            allFields={allFields}
            metaObjects={metaObjects}
            entityTargets={entityTargets}
          />
        );
      case 'entity_reference':
        return (
          <EntityReferenceInput
            field={field}
            value={value}
            onChange={onChange}
            entityTargets={entityTargets ?? []}
          />
        );
      default:
        return <Input value={String(value ?? '')} onChange={(e) => onChange(e.target.value)} />;
    }
  };

  if (field.settings?.options?.length) {
    return (
      <ConditionalWrapper field={field} allFields={allFields} data={formData}>
        <div className="flex flex-col gap-2">
          <Label>
            {field.label}
            {field.required ? ' *' : ''}
          </Label>
          <Select
            value={typeof value === 'string' ? value : ''}
            onChange={(e) => onChange(e.target.value)}
          >
            <option value="">Select {field.label}</option>
            {field.settings.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </div>
      </ConditionalWrapper>
    );
  }

  return (
    <ConditionalWrapper field={field} allFields={allFields} data={formData}>
      <div className="flex flex-col gap-2">
        {field.type !== 'boolean' && (
          <Label>
            {field.label}
            {field.required ? ' *' : ''}
            {field.localized ? ' (localized)' : ''}
          </Label>
        )}
        {renderInput()}
      </div>
    </ConditionalWrapper>
  );
}

function referenceIds(value: unknown, cardinality: 'one' | 'many'): string | string[] | undefined {
  if (cardinality === 'many') {
    if (!Array.isArray(value)) return [];
    return value
      .map((item) => parseEntityReference(item)?.entityId)
      .filter((id): id is string => Boolean(id));
  }
  return parseEntityReference(value)?.entityId;
}

function resolveEntityTarget(
  settings: MetaFieldDefinition['settings'],
): { category: 'meta_object' | 'system'; slug: string } | null {
  const reference = settings?.entityReference;
  if (!reference?.targetSlug && !reference?.targetCategory) return null;
  const parsed = reference.targetSlug ? parseEntityReferenceKey(reference.targetSlug) : null;
  const category =
    parsed?.category ??
    reference.targetCategory ??
    (reference.targetSlug ? 'meta_object' : undefined);
  const slug = parsed?.slug ?? (parsed ? undefined : reference.targetSlug);
  if (!category || !slug) return null;
  return { category, slug };
}

function recordListUrl(category: 'meta_object' | 'system', slug: string): string {
  if (category === 'system') return `/api/v1/system-entities/${slug}/records?limit=50`;
  return `/api/v1/meta-objects/${slug}/entries?limit=50`;
}

function EntityReferenceInput({
  field,
  value,
  onChange,
  entityTargets,
}: {
  field: MetaFieldDefinition;
  value: unknown;
  onChange: (value: unknown) => void;
  entityTargets: EntityTargetOption[];
}) {
  const configured = resolveEntityTarget(field.settings);
  const cardinality = field.settings?.entityReference?.cardinality ?? 'one';
  const [pickedKey, setPickedKey] = useState(
    configured ? entityReferenceKey(configured.category, configured.slug) : '',
  );
  const picked = pickedKey ? parseEntityReferenceKey(pickedKey) : null;
  const target = configured ?? (picked ? { category: picked.category, slug: picked.slug } : null);

  const writeIds = (next: string | string[]) => {
    if (!target) return;
    const entityType = entityReferenceKey(target.category, target.slug);
    if (cardinality === 'many') {
      const ids = Array.isArray(next) ? next : [next];
      onChange(ids.map((entityId) => ({ entityType, entityId })));
      return;
    }
    const entityId = Array.isArray(next) ? next[0] : next;
    onChange(entityId ? { entityType, entityId } : undefined);
  };

  return (
    <div className="flex flex-col gap-2">
      {!configured && (
        <Select
          value={pickedKey}
          onChange={(event) => {
            setPickedKey(event.target.value);
            onChange(cardinality === 'many' ? [] : undefined);
          }}
        >
          <option value="">Select record type</option>
          {entityTargets.map((item) => (
            <option
              key={`${item.category}:${item.slug}`}
              value={entityReferenceKey(item.category, item.slug)}
            >
              {item.name}
            </option>
          ))}
        </Select>
      )}
      {target ? (
        <RelationPicker
          targetSlug={target.slug}
          cardinality={cardinality}
          listUrl={recordListUrl(target.category, target.slug)}
          inputName={`entity-${field.key}-${target.category}-${target.slug}`}
          value={referenceIds(value, cardinality)}
          onChange={writeIds}
        />
      ) : (
        <p className="text-sm text-muted-foreground">Choose a record type to search entries.</p>
      )}
    </div>
  );
}

export function getFieldValue(data: Record<string, unknown>, field: MetaFieldDefinition): unknown {
  return getNestedValue(data, field.key);
}

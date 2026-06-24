'use client';

import type { MetaFieldDefinition } from '@zodyk/core';
import { Checkbox, Input, Label, Select } from '@zodyk/shared-ui';
import { MediaPicker } from '@/components/media/MediaPicker';
import { ConditionalWrapper } from './ConditionalWrapper';
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
}

export function DynamicFieldRenderer({
  field,
  value,
  onChange,
  allFields,
  formData,
  metaObjects,
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
            <Checkbox
              checked={Boolean(value)}
              onChange={(e) => onChange(e.target.checked)}
            />
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
        return (
          <MediaPicker
            mode="multiple"
            accept="image/*"
            value={ids}
            onChange={onChange}
          />
        );
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
          <Select value={typeof value === 'string' ? value : ''} onChange={(e) => onChange(e.target.value)}>
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

export function getFieldValue(data: Record<string, unknown>, field: MetaFieldDefinition): unknown {
  return getNestedValue(data, field.key);
}

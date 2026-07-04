'use client';

import { META_FIELD_TYPES, type MetaFieldDefinition } from '@zodyk/core';
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Select } from '@zodyk/shared-ui';
import { cn } from '@zodyk/shared-ui';
import { GripVertical, Plus } from 'lucide-react';
import { useState } from 'react';
import { formatFieldTypeLabel, getFieldTypeIcon } from './field-type-utils';

type MetaFieldsListProps = {
  groupKey: string;
  fields: MetaFieldDefinition[];
  onChange: (fields: MetaFieldDefinition[]) => void;
  metaObjectSlugs?: { slug: string; name: string }[];
};

export function MetaFieldsList({
  groupKey,
  fields,
  onChange,
  metaObjectSlugs,
}: MetaFieldsListProps) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const groupFields = fields
    .filter((f) => f.group === groupKey && !f.isSystem)
    .sort((a, b) => a.order - b.order);

  const updateField = (key: string, patch: Partial<MetaFieldDefinition>) => {
    onChange(fields.map((f) => (f.key === key ? { ...f, ...patch } : f)));
  };

  const addField = () => {
    const key = `field_${groupFields.length + 1}`;
    const newField: MetaFieldDefinition = {
      key,
      group: groupKey,
      label: 'New Field',
      type: 'text',
      required: false,
      localized: false,
      order: groupFields.length,
    };
    onChange([...fields, newField]);
    setSelectedKey(key);
  };

  const removeField = (key: string) => {
    onChange(fields.filter((f) => f.key !== key));
    if (selectedKey === key) setSelectedKey(null);
  };

  const moveField = (key: string, direction: -1 | 1) => {
    const sorted = [...groupFields];
    const idx = sorted.findIndex((f) => f.key === key);
    const swapIdx = idx + direction;
    if (idx < 0 || swapIdx < 0 || swapIdx >= sorted.length) return;

    const a = sorted[idx]!;
    const b = sorted[swapIdx]!;
    onChange(
      fields.map((f) => {
        if (f.key === a.key) return { ...f, order: b.order };
        if (f.key === b.key) return { ...f, order: a.order };
        return f;
      }),
    );
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle>Fields</CardTitle>
        <p className="text-sm text-muted-foreground">Drag to reorder. Click a field to edit.</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <ul className="divide-y divide-border rounded-lg border border-border">
          {groupFields.map((field) => {
            const Icon = getFieldTypeIcon(field.type);
            const isSelected = selectedKey === field.key;

            return (
              <li key={field.key}>
                <button
                  type="button"
                  onClick={() => setSelectedKey(isSelected ? null : field.key)}
                  className={cn(
                    'flex w-full items-center gap-3 px-4 py-3 text-left transition-colors',
                    isSelected ? 'bg-muted/60' : 'hover:bg-muted/30',
                  )}
                >
                  <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground/50" />
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground">{field.label}</span>
                      {field.required && (
                        <Badge variant="destructive" className="text-[10px]">
                          required
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{field.key}</p>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatFieldTypeLabel(field.type, field.settings)}
                  </span>
                </button>

                {isSelected && (
                  <div className="border-t border-border bg-muted/20 px-4 py-4">
                    <FieldEditor
                      field={field}
                      metaObjectSlugs={metaObjectSlugs}
                      onChange={(patch) => updateField(field.key, patch)}
                      onMoveUp={() => moveField(field.key, -1)}
                      onMoveDown={() => moveField(field.key, 1)}
                      onRemove={() => removeField(field.key)}
                    />
                  </div>
                )}
              </li>
            );
          })}
        </ul>

        <Button type="button" variant="outline" className="w-full" onClick={addField}>
          <Plus className="h-4 w-4" />
          Add field
        </Button>
      </CardContent>
    </Card>
  );
}

function FieldEditor({
  field,
  metaObjectSlugs,
  onChange,
  onMoveUp,
  onMoveDown,
  onRemove,
}: {
  field: MetaFieldDefinition;
  metaObjectSlugs?: { slug: string; name: string }[];
  onChange: (patch: Partial<MetaFieldDefinition>) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <div>
        <Label>Label</Label>
        <Input value={field.label} onChange={(e) => onChange({ label: e.target.value })} />
      </div>
      <div>
        <Label>Key</Label>
        <Input
          value={field.key}
          onChange={(e) =>
            onChange({ key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_') })
          }
        />
      </div>
      <div>
        <Label>Type</Label>
        <Select value={field.type} onChange={(e) => onChange({ type: e.target.value as MetaFieldDefinition['type'] })}>
          {META_FIELD_TYPES.map((t) => (
            <option key={t} value={t}>
              {formatFieldTypeLabel(t)}
            </option>
          ))}
        </Select>
      </div>
      <div className="flex items-end gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={field.required ?? false}
            onChange={(e) => onChange({ required: e.target.checked })}
          />
          Required
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={field.localized ?? false}
            onChange={(e) => onChange({ localized: e.target.checked })}
          />
          Localized
        </label>
      </div>

      {field.type === 'relation' && (
        <>
          <div>
            <Label>Target type</Label>
            <Select
              value={field.settings?.relation?.targetSlug ?? ''}
              onChange={(e) =>
                onChange({
                  settings: {
                    ...field.settings,
                    relation: {
                      targetSlug: e.target.value,
                      cardinality: field.settings?.relation?.cardinality ?? 'one',
                    },
                  },
                })
              }
            >
              <option value="">Select target</option>
              {(metaObjectSlugs ?? []).map((m) => (
                <option key={m.slug} value={m.slug}>
                  {m.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Cardinality</Label>
            <Select
              value={field.settings?.relation?.cardinality ?? 'one'}
              onChange={(e) =>
                onChange({
                  settings: {
                    ...field.settings,
                    relation: {
                      targetSlug: field.settings?.relation?.targetSlug ?? '',
                      cardinality: e.target.value as 'one' | 'many',
                    },
                  },
                })
              }
            >
              <option value="one">One</option>
              <option value="many">Many</option>
            </Select>
          </div>
        </>
      )}

      <div className="flex gap-2 md:col-span-2">
        <Button type="button" variant="outline" size="sm" onClick={onMoveUp}>
          Move up
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={onMoveDown}>
          Move down
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={onRemove}>
          Remove
        </Button>
      </div>
    </div>
  );
}

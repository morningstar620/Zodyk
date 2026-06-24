'use client';

import { META_FIELD_TYPES, type MetaFieldDefinition } from '@zodyk/core';
import { Button, Input, Label, Select } from '@zodyk/shared-ui';

interface FieldBuilderProps {
  groupKey: string;
  fields: MetaFieldDefinition[];
  onChange: (fields: MetaFieldDefinition[]) => void;
  metaObjectSlugs?: { slug: string; name: string }[];
}

export function FieldBuilder({ groupKey, fields, onChange, metaObjectSlugs }: FieldBuilderProps) {
  const groupFields = fields
    .filter((f) => f.group === groupKey && !f.isSystem)
    .sort((a, b) => a.order - b.order);

  const updateField = (index: number, patch: Partial<MetaFieldDefinition>) => {
    const globalIndex = fields.findIndex((f) => f.key === groupFields[index]?.key);
    if (globalIndex < 0) return;
    const next = [...fields];
    next[globalIndex] = { ...next[globalIndex]!, ...patch };
    onChange(next);
  };

  const addField = () => {
    const key = `field_${groupFields.length + 1}`;
    onChange([
      ...fields,
      {
        key,
        group: groupKey,
        label: 'New Field',
        type: 'text',
        required: false,
        localized: false,
        order: groupFields.length,
      },
    ]);
  };

  const removeField = (key: string) => {
    onChange(fields.filter((f) => f.key !== key));
  };

  const moveField = (key: string, direction: -1 | 1) => {
    const sorted = [...groupFields];
    const idx = sorted.findIndex((f) => f.key === key);
    const swapIdx = idx + direction;
    if (idx < 0 || swapIdx < 0 || swapIdx >= sorted.length) return;

    const a = sorted[idx]!;
    const b = sorted[swapIdx]!;
    const next = fields.map((f) => {
      if (f.key === a.key) return { ...f, order: b.order };
      if (f.key === b.key) return { ...f, order: a.order };
      return f;
    });
    onChange(next);
  };

  return (
    <div className="flex flex-col gap-4">
      {groupFields.map((field, index) => (
        <div key={field.key} className="rounded-md border border-zinc-200 p-4">
          <div className="mb-3 grid gap-3 md:grid-cols-2">
            <div>
              <Label>Label</Label>
              <Input
                value={field.label}
                onChange={(e) => updateField(index, { label: e.target.value })}
              />
            </div>
            <div>
              <Label>Key</Label>
              <Input
                value={field.key}
                onChange={(e) =>
                  updateField(index, {
                    key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'),
                  })
                }
              />
            </div>
            <div>
              <Label>Type</Label>
              <Select
                value={field.type}
                onChange={(e) =>
                  updateField(index, { type: e.target.value as MetaFieldDefinition['type'] })
                }
              >
                {META_FIELD_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t.replace('_', ' ')}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex items-end gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={field.required ?? false}
                  onChange={(e) => updateField(index, { required: e.target.checked })}
                />
                Required
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={field.localized ?? false}
                  onChange={(e) => updateField(index, { localized: e.target.checked })}
                />
                Localized
              </label>
            </div>
          </div>

          {field.type === 'relation' && (
            <div className="mb-3 grid gap-3 md:grid-cols-2">
              <div>
                <Label>Target type</Label>
                <Select
                  value={field.settings?.relation?.targetSlug ?? ''}
                  onChange={(e) =>
                    updateField(index, {
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
                    updateField(index, {
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
            </div>
          )}

          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => moveField(field.key, -1)}>
              Up
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => moveField(field.key, 1)}>
              Down
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => removeField(field.key)}>
              Remove
            </Button>
          </div>
        </div>
      ))}
      <Button type="button" variant="outline" onClick={addField}>
        Add field
      </Button>
    </div>
  );
}

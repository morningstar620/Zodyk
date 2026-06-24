'use client';

import type { MetaFieldDefinition } from '@zodyk/core';
import { Button } from '@zodyk/shared-ui';
import { DynamicFieldRenderer } from './DynamicFieldRenderer';
import { getNestedValue, setNestedValue } from './utils';

interface RepeaterFieldProps {
  field: MetaFieldDefinition;
  value: Record<string, unknown>[];
  onChange: (value: Record<string, unknown>[]) => void;
  allFields: MetaFieldDefinition[];
  metaObjects?: { slug: string; name: string }[];
}

export function RepeaterField({
  field,
  value,
  onChange,
  allFields,
  metaObjects,
}: RepeaterFieldProps) {
  const subFields = field.settings?.repeater?.fields ?? [];
  const items = Array.isArray(value) ? value : [];

  const updateItem = (index: number, subKey: string, subValue: unknown) => {
    const next = [...items];
    const current = (next[index] ?? {}) as Record<string, unknown>;
    next[index] = setNestedValue(current, subKey, subValue);
    onChange(next);
  };

  const addItem = () => onChange([...items, {}]);
  const removeItem = (index: number) => onChange(items.filter((_, i) => i !== index));

  return (
    <div className="flex flex-col gap-4">
      {items.map((item, index) => (
        <div key={index} className="rounded-md border border-zinc-200 p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-medium text-zinc-700">Item {index + 1}</span>
            <Button type="button" variant="outline" size="sm" onClick={() => removeItem(index)}>
              Remove
            </Button>
          </div>
          <div className="flex flex-col gap-4">
            {subFields.map((subField) => (
              <DynamicFieldRenderer
                key={`${index}-${subField.key}`}
                field={subField}
                value={getNestedValue(item as Record<string, unknown>, subField.key)}
                onChange={(v) => updateItem(index, subField.key, v)}
                allFields={allFields}
                formData={item as Record<string, unknown>}
                metaObjects={metaObjects}
              />
            ))}
          </div>
        </div>
      ))}
      <Button type="button" variant="outline" onClick={addItem}>
        Add {field.label}
      </Button>
    </div>
  );
}

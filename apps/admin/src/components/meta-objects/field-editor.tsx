'use client';

import {
  CONDITIONAL_OPERATORS,
  META_FIELD_TYPES,
  type ConditionalOperator,
  type ConditionalRule,
  type MetaFieldDefinition,
  type ValidationRules,
} from '@zodyk/core';
import { Button, Input, Label, Select } from '@zodyk/shared-ui';
import { useState } from 'react';
import type { EntityTargetOption } from '@/components/content/entity-targets';
import { formatFieldTypeLabel } from './field-type-utils';

const OPTION_TYPES = new Set<MetaFieldDefinition['type']>([
  'text',
  'number',
  'rich_text',
  'url',
  'code',
]);

const TEXT_VALIDATION_TYPES = new Set<MetaFieldDefinition['type']>([
  'text',
  'rich_text',
  'code',
  'url',
]);

const OPERATOR_LABELS: Record<ConditionalOperator, string> = {
  equals: 'Equals',
  not_equals: 'Does not equal',
  contains: 'Contains',
  empty: 'Is empty',
  not_empty: 'Is not empty',
  gt: 'Greater than',
  lt: 'Less than',
};

function sanitizeFieldKey(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/^_+/, '');
}

function uniqueFieldKey(fields: { key: string }[], prefix: string): string {
  const taken = new Set(fields.map((field) => field.key));
  let n = fields.length + 1;
  let key = `${prefix}_${n}`;
  while (taken.has(key)) {
    n += 1;
    key = `${prefix}_${n}`;
  }
  return key;
}

function optionalNumber(value: string): number | undefined {
  if (value.trim() === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

type FieldEditorProps = {
  field: MetaFieldDefinition;
  fields: MetaFieldDefinition[];
  entityTargets?: EntityTargetOption[];
  depth?: number;
  onChange: (patch: Partial<MetaFieldDefinition>) => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onRemove?: () => void;
};

export function FieldEditor({
  field,
  fields,
  entityTargets = [],
  depth = 0,
  onChange,
  onMoveUp,
  onMoveDown,
  onRemove,
}: FieldEditorProps) {
  const typeChoices = META_FIELD_TYPES.filter((type) => depth < 2 || type !== 'repeater');
  const showOptions = OPTION_TYPES.has(field.type) || Boolean(field.settings?.options?.length);

  const changeType = (type: MetaFieldDefinition['type']) => {
    if (type === 'repeater') {
      onChange({
        type,
        settings: {
          ...field.settings,
          repeater: field.settings?.repeater ?? { fields: [] },
        },
      });
      return;
    }
    if (type === 'entity_reference') {
      onChange({
        type,
        settings: {
          ...field.settings,
          entityReference: field.settings?.entityReference ?? { cardinality: 'one' },
        },
      });
      return;
    }
    onChange({ type });
  };

  return (
    <div className="grid gap-3 md:grid-cols-2">
      <div>
        <Label>Label</Label>
        <Input value={field.label} onChange={(event) => onChange({ label: event.target.value })} />
      </div>
      <div>
        <Label>Key</Label>
        <Input
          value={field.key}
          onChange={(event) => {
            const key = sanitizeFieldKey(event.target.value);
            if (key) onChange({ key });
          }}
        />
      </div>
      <div>
        <Label>Type</Label>
        <Select
          value={field.type}
          onChange={(event) => changeType(event.target.value as MetaFieldDefinition['type'])}
        >
          {typeChoices.map((type) => (
            <option key={type} value={type}>
              {formatFieldTypeLabel(type)}
            </option>
          ))}
        </Select>
      </div>
      <div className="flex items-end gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={field.required ?? false}
            onChange={(event) => onChange({ required: event.target.checked })}
          />
          Required
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={field.localized ?? false}
            onChange={(event) => onChange({ localized: event.target.checked })}
          />
          Localized
        </label>
      </div>

      {OPTION_TYPES.has(field.type) && (
        <div className="md:col-span-2">
          <Label>Placeholder</Label>
          <Input
            value={field.settings?.placeholder ?? ''}
            onChange={(event) =>
              onChange({
                settings: {
                  ...field.settings,
                  placeholder: event.target.value || undefined,
                },
              })
            }
          />
        </div>
      )}

      {field.type === 'relation' && (
        <RelationSettings field={field} entityTargets={entityTargets} onChange={onChange} />
      )}

      {field.type === 'entity_reference' && (
        <EntityReferenceSettings field={field} entityTargets={entityTargets} onChange={onChange} />
      )}

      {field.type === 'repeater' && (
        <RepeaterSettings
          field={field}
          entityTargets={entityTargets}
          depth={depth}
          onChange={onChange}
        />
      )}

      {showOptions && <OptionsEditor field={field} onChange={onChange} />}

      {(TEXT_VALIDATION_TYPES.has(field.type) || field.type === 'number') && (
        <ValidationEditor field={field} onChange={onChange} />
      )}

      <ConditionalEditor field={field} fields={fields} onChange={onChange} />

      {(onMoveUp || onMoveDown || onRemove) && (
        <div className="flex gap-2 md:col-span-2">
          {onMoveUp && (
            <Button type="button" variant="outline" size="sm" onClick={onMoveUp}>
              Move up
            </Button>
          )}
          {onMoveDown && (
            <Button type="button" variant="outline" size="sm" onClick={onMoveDown}>
              Move down
            </Button>
          )}
          {onRemove && (
            <Button type="button" variant="outline" size="sm" onClick={onRemove}>
              Remove
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function RelationSettings({
  field,
  entityTargets,
  onChange,
}: {
  field: MetaFieldDefinition;
  entityTargets: EntityTargetOption[];
  onChange: (patch: Partial<MetaFieldDefinition>) => void;
}) {
  const metaTargets = entityTargets.filter((target) => target.category === 'meta_object');
  return (
    <>
      <div>
        <Label>Target type</Label>
        <Select
          value={field.settings?.relation?.targetSlug ?? ''}
          onChange={(event) => {
            if (!event.target.value) {
              const rest = { ...(field.settings ?? {}) };
              delete rest.relation;
              onChange({ settings: rest });
              return;
            }
            onChange({
              settings: {
                ...field.settings,
                relation: {
                  targetSlug: event.target.value,
                  cardinality: field.settings?.relation?.cardinality ?? 'one',
                },
              },
            });
          }}
        >
          <option value="">Select target</option>
          {metaTargets.map((target) => (
            <option key={target.slug} value={target.slug}>
              {target.name}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label>Cardinality</Label>
        <Select
          value={field.settings?.relation?.cardinality ?? 'one'}
          onChange={(event) => {
            const targetSlug = field.settings?.relation?.targetSlug;
            if (!targetSlug) return;
            onChange({
              settings: {
                ...field.settings,
                relation: {
                  targetSlug,
                  cardinality: event.target.value as 'one' | 'many',
                },
              },
            });
          }}
        >
          <option value="one">One</option>
          <option value="many">Many</option>
        </Select>
      </div>
    </>
  );
}

function EntityReferenceSettings({
  field,
  entityTargets,
  onChange,
}: {
  field: MetaFieldDefinition;
  entityTargets: EntityTargetOption[];
  onChange: (patch: Partial<MetaFieldDefinition>) => void;
}) {
  const reference = field.settings?.entityReference;
  const category = reference?.targetCategory ?? '';
  const targets = entityTargets.filter((target) => !category || target.category === category);

  const write = (patch: NonNullable<MetaFieldDefinition['settings']>['entityReference']) => {
    onChange({
      settings: {
        ...field.settings,
        entityReference: {
          cardinality: reference?.cardinality ?? 'one',
          ...patch,
        },
      },
    });
  };

  return (
    <>
      <div>
        <Label>Target category</Label>
        <Select
          value={category}
          onChange={(event) => {
            const next = event.target.value as 'meta_object' | 'system' | '';
            write({
              targetCategory: next || undefined,
              targetSlug: undefined,
              cardinality: reference?.cardinality ?? 'one',
            });
          }}
        >
          <option value="">Any</option>
          <option value="meta_object">Meta object</option>
          <option value="system">System entity</option>
        </Select>
      </div>
      <div>
        <Label>Target</Label>
        <Select
          value={reference?.targetSlug ?? ''}
          onChange={(event) =>
            write({
              targetCategory: reference?.targetCategory,
              targetSlug: event.target.value || undefined,
              cardinality: reference?.cardinality ?? 'one',
            })
          }
        >
          <option value="">Any record type</option>
          {targets.map((target) => (
            <option key={`${target.category}:${target.slug}`} value={target.slug}>
              {target.name}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label>Cardinality</Label>
        <Select
          value={reference?.cardinality ?? 'one'}
          onChange={(event) =>
            write({
              targetCategory: reference?.targetCategory,
              targetSlug: reference?.targetSlug,
              cardinality: event.target.value as 'one' | 'many',
            })
          }
        >
          <option value="one">One</option>
          <option value="many">Many</option>
        </Select>
      </div>
    </>
  );
}

function RepeaterSettings({
  field,
  entityTargets,
  depth,
  onChange,
}: {
  field: MetaFieldDefinition;
  entityTargets: EntityTargetOption[];
  depth: number;
  onChange: (patch: Partial<MetaFieldDefinition>) => void;
}) {
  const [openKey, setOpenKey] = useState<string | null>(null);
  const subfields = field.settings?.repeater?.fields ?? [];

  const writeFields = (next: MetaFieldDefinition[]) => {
    onChange({
      settings: {
        ...field.settings,
        repeater: {
          minItems: field.settings?.repeater?.minItems,
          maxItems: field.settings?.repeater?.maxItems,
          fields: next.map((subfield, index) => ({
            ...subfield,
            group: subfield.group || field.group,
            order: index,
          })),
        },
      },
    });
  };

  const updateSubfield = (key: string, patch: Partial<MetaFieldDefinition>) => {
    writeFields(
      subfields.map((subfield) => (subfield.key === key ? { ...subfield, ...patch } : subfield)),
    );
    if (patch.key && patch.key !== key) setOpenKey(patch.key);
  };

  return (
    <div className="space-y-3 rounded-md border border-border p-3 md:col-span-2">
      <p className="text-sm font-medium text-foreground">Repeater fields</p>
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <Label>Minimum items</Label>
          <Input
            type="number"
            min={0}
            value={field.settings?.repeater?.minItems ?? ''}
            onChange={(event) =>
              onChange({
                settings: {
                  ...field.settings,
                  repeater: {
                    fields: subfields,
                    maxItems: field.settings?.repeater?.maxItems,
                    minItems: optionalNumber(event.target.value),
                  },
                },
              })
            }
          />
        </div>
        <div>
          <Label>Maximum items</Label>
          <Input
            type="number"
            min={0}
            value={field.settings?.repeater?.maxItems ?? ''}
            onChange={(event) =>
              onChange({
                settings: {
                  ...field.settings,
                  repeater: {
                    fields: subfields,
                    minItems: field.settings?.repeater?.minItems,
                    maxItems: optionalNumber(event.target.value),
                  },
                },
              })
            }
          />
        </div>
      </div>
      <ul className="divide-y divide-border rounded-md border border-border">
        {subfields.map((subfield) => (
          <li key={subfield.key} className="px-3 py-2">
            <button
              type="button"
              className="flex w-full items-center justify-between text-left text-sm"
              onClick={() => setOpenKey(openKey === subfield.key ? null : subfield.key)}
            >
              <span className="font-medium">{subfield.label}</span>
              <span className="text-xs text-muted-foreground">
                {formatFieldTypeLabel(subfield.type, subfield.settings)}
              </span>
            </button>
            {openKey === subfield.key && (
              <div className="mt-3">
                <FieldEditor
                  field={subfield}
                  fields={subfields}
                  entityTargets={entityTargets}
                  depth={depth + 1}
                  onChange={(patch) => updateSubfield(subfield.key, patch)}
                  onRemove={() => {
                    writeFields(subfields.filter((item) => item.key !== subfield.key));
                    setOpenKey(null);
                  }}
                />
              </div>
            )}
          </li>
        ))}
      </ul>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => {
          const key = uniqueFieldKey(subfields, 'item');
          writeFields([
            ...subfields,
            {
              key,
              group: field.group,
              label: 'New field',
              type: 'text',
              order: subfields.length,
            },
          ]);
          setOpenKey(key);
        }}
      >
        Add repeater field
      </Button>
    </div>
  );
}

function OptionsEditor({
  field,
  onChange,
}: {
  field: MetaFieldDefinition;
  onChange: (patch: Partial<MetaFieldDefinition>) => void;
}) {
  const options = field.settings?.options ?? [];

  const write = (next: { label: string; value: string }[]) => {
    onChange({
      settings: {
        ...field.settings,
        options: next.length > 0 ? next : undefined,
      },
    });
  };

  return (
    <div className="space-y-2 md:col-span-2">
      <Label>Options</Label>
      <p className="text-xs text-muted-foreground">
        When options are set, the entry form renders a select.
      </p>
      {options.map((option, index) => (
        <div key={index} className="grid grid-cols-[1fr_1fr_auto] gap-2">
          <Input
            value={option.label}
            placeholder="Label"
            onChange={(event) =>
              write(
                options.map((item, itemIndex) =>
                  itemIndex === index ? { ...item, label: event.target.value } : item,
                ),
              )
            }
          />
          <Input
            value={option.value}
            placeholder="Value"
            onChange={(event) =>
              write(
                options.map((item, itemIndex) =>
                  itemIndex === index ? { ...item, value: event.target.value } : item,
                ),
              )
            }
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => write(options.filter((_, itemIndex) => itemIndex !== index))}
          >
            Remove
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() =>
          write([...options, { label: 'Option', value: `option_${options.length + 1}` }])
        }
      >
        Add option
      </Button>
    </div>
  );
}

function ValidationEditor({
  field,
  onChange,
}: {
  field: MetaFieldDefinition;
  onChange: (patch: Partial<MetaFieldDefinition>) => void;
}) {
  const rules = field.validation ?? {};

  const write = (patch: ValidationRules) => {
    const next = { ...rules, ...patch };
    const cleaned = Object.fromEntries(
      Object.entries(next).filter(([, value]) => value !== undefined && value !== ''),
    );
    onChange({ validation: Object.keys(cleaned).length > 0 ? cleaned : undefined });
  };

  if (field.type === 'number') {
    return (
      <>
        <div>
          <Label>Minimum</Label>
          <Input
            type="number"
            value={rules.min ?? ''}
            onChange={(event) => write({ min: optionalNumber(event.target.value) })}
          />
        </div>
        <div>
          <Label>Maximum</Label>
          <Input
            type="number"
            value={rules.max ?? ''}
            onChange={(event) => write({ max: optionalNumber(event.target.value) })}
          />
        </div>
      </>
    );
  }

  return (
    <>
      <div>
        <Label>Min length</Label>
        <Input
          type="number"
          min={0}
          value={rules.minLength ?? ''}
          onChange={(event) => write({ minLength: optionalNumber(event.target.value) })}
        />
      </div>
      <div>
        <Label>Max length</Label>
        <Input
          type="number"
          min={0}
          value={rules.maxLength ?? ''}
          onChange={(event) => write({ maxLength: optionalNumber(event.target.value) })}
        />
      </div>
      <div className="md:col-span-2">
        <Label>Pattern</Label>
        <Input
          value={rules.pattern ?? ''}
          placeholder="Regular expression"
          onChange={(event) => write({ pattern: event.target.value || undefined })}
        />
      </div>
    </>
  );
}

function ConditionalEditor({
  field,
  fields,
  onChange,
}: {
  field: MetaFieldDefinition;
  fields: MetaFieldDefinition[];
  onChange: (patch: Partial<MetaFieldDefinition>) => void;
}) {
  const rules = field.conditional ?? [];
  const choices = fields.filter((item) => item.key !== field.key);

  const write = (next: ConditionalRule[]) => {
    onChange({ conditional: next.length > 0 ? next : undefined });
  };

  return (
    <div className="space-y-3 md:col-span-2">
      <Label>Conditional rules</Label>
      <p className="text-xs text-muted-foreground">
        Show rules keep only the selected fields visible while they match. Hide rules remove those
        fields.
      </p>
      {choices.length === 0 ? (
        <p className="text-xs text-muted-foreground">Add another field to create a condition.</p>
      ) : (
        rules.map((rule, index) => {
          const needsValue = rule.when.operator !== 'empty' && rule.when.operator !== 'not_empty';
          return (
            <div key={index} className="space-y-2 rounded-md border border-border p-3">
              <div className="grid gap-2 md:grid-cols-3">
                <Select
                  value={rule.when.field}
                  onChange={(event) =>
                    write(
                      rules.map((item, itemIndex) =>
                        itemIndex === index
                          ? { ...item, when: { ...item.when, field: event.target.value } }
                          : item,
                      ),
                    )
                  }
                >
                  {choices.map((choice) => (
                    <option key={choice.key} value={choice.key}>
                      {choice.label}
                    </option>
                  ))}
                </Select>
                <Select
                  value={rule.when.operator}
                  onChange={(event) =>
                    write(
                      rules.map((item, itemIndex) =>
                        itemIndex === index
                          ? {
                              ...item,
                              when: {
                                ...item.when,
                                operator: event.target.value as ConditionalOperator,
                              },
                            }
                          : item,
                      ),
                    )
                  }
                >
                  {CONDITIONAL_OPERATORS.map((operator) => (
                    <option key={operator} value={operator}>
                      {OPERATOR_LABELS[operator]}
                    </option>
                  ))}
                </Select>
                <Select
                  value={rule.action}
                  onChange={(event) =>
                    write(
                      rules.map((item, itemIndex) =>
                        itemIndex === index
                          ? { ...item, action: event.target.value as 'show' | 'hide' }
                          : item,
                      ),
                    )
                  }
                >
                  <option value="show">Show</option>
                  <option value="hide">Hide</option>
                </Select>
              </div>
              {needsValue && (
                <Input
                  value={
                    rule.when.value === undefined || rule.when.value === null
                      ? ''
                      : String(rule.when.value)
                  }
                  placeholder="Value"
                  onChange={(event) => {
                    const raw = event.target.value;
                    const value =
                      rule.when.operator === 'gt' || rule.when.operator === 'lt'
                        ? optionalNumber(raw)
                        : raw;
                    write(
                      rules.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, when: { ...item.when, value } } : item,
                      ),
                    );
                  }}
                />
              )}
              <div className="flex flex-wrap gap-3">
                {choices.map((choice) => {
                  const checked = rule.targets.includes(choice.key);
                  return (
                    <label key={choice.key} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(event) => {
                          const targets = event.target.checked
                            ? [...rule.targets, choice.key]
                            : rule.targets.filter((key) => key !== choice.key);
                          if (targets.length === 0) return;
                          write(
                            rules.map((item, itemIndex) =>
                              itemIndex === index ? { ...item, targets } : item,
                            ),
                          );
                        }}
                      />
                      {choice.label}
                    </label>
                  );
                })}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => write(rules.filter((_, itemIndex) => itemIndex !== index))}
              >
                Remove rule
              </Button>
            </div>
          );
        })
      )}
      {choices.length > 0 && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            const source = choices[0]!;
            const target = choices.find((choice) => choice.key !== source.key) ?? source;
            write([
              ...rules,
              {
                when: { field: source.key, operator: 'equals', value: '' },
                action: 'show',
                targets: [target.key],
              },
            ]);
          }}
        >
          Add conditional rule
        </Button>
      )}
    </div>
  );
}

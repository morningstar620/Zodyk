export const META_FIELD_TYPES = [
  'text',
  'rich_text',
  'number',
  'boolean',
  'date',
  'datetime',
  'url',
  'code',
  'json',
  'image',
  'gallery',
  'file',
  'relation',
  'repeater',
] as const;

export type MetaFieldType = (typeof META_FIELD_TYPES)[number];

export const CONDITIONAL_OPERATORS = [
  'equals',
  'not_equals',
  'contains',
  'empty',
  'not_empty',
  'gt',
  'lt',
] as const;

export type ConditionalOperator = (typeof CONDITIONAL_OPERATORS)[number];

export interface RelationSettings {
  targetSlug: string;
  cardinality: 'one' | 'many';
}

export interface SelectOption {
  label: string;
  value: string;
}

export interface FieldTypeSettings {
  relation?: RelationSettings;
  repeater?: { minItems?: number; maxItems?: number; fields: import('./field-definition.js').MetaFieldDefinition[] };
  options?: SelectOption[];
  placeholder?: string;
  rows?: number;
}

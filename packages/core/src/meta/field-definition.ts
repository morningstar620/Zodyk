import { z } from 'zod';
import {
  CONDITIONAL_OPERATORS,
  META_FIELD_TYPES,
  type ConditionalOperator,
  type FieldTypeSettings,
  type MetaFieldType,
} from './field-types';

export const validationRulesSchema = z.object({
  minLength: z.number().int().min(0).optional(),
  maxLength: z.number().int().min(0).optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  pattern: z.string().optional(),
  required: z.boolean().optional(),
});

export type ValidationRules = z.infer<typeof validationRulesSchema>;

export const conditionalRuleSchema = z.object({
  when: z.object({
    field: z.string().min(1),
    operator: z.enum(CONDITIONAL_OPERATORS as unknown as [ConditionalOperator, ...ConditionalOperator[]]),
    value: z.unknown().optional(),
  }),
  action: z.enum(['show', 'hide']),
  targets: z.array(z.string().min(1)).min(1),
});

export type ConditionalRule = z.infer<typeof conditionalRuleSchema>;

export interface MetaFieldDefinition {
  key: string;
  group: string;
  label: string;
  type: MetaFieldType;
  required?: boolean;
  localized?: boolean;
  isSystem?: boolean;
  unique?: boolean;
  searchable?: boolean;
  filterable?: boolean;
  sortable?: boolean;
  hidden?: boolean;
  readOnly?: boolean;
  defaultValue?: unknown;
  validation?: ValidationRules;
  conditional?: ConditionalRule[];
  settings?: FieldTypeSettings;
  order: number;
}

const fieldSettingsSchema = z.object({
  relation: z
    .object({
      targetSlug: z.string().min(1),
      cardinality: z.enum(['one', 'many']),
    })
    .optional(),
  entityReference: z
    .object({
      targetCategory: z.enum(['meta_object', 'system']).optional(),
      targetSlug: z.string().min(1).optional(),
      cardinality: z.enum(['one', 'many']),
    })
    .optional(),
  options: z.array(z.object({ label: z.string(), value: z.string() })).optional(),
  placeholder: z.string().optional(),
  rows: z.number().int().min(1).optional(),
});

export const metaFieldDefinitionSchema: z.ZodType<MetaFieldDefinition, z.ZodTypeDef, unknown> = z.lazy(() =>
  z.object({
    key: z
      .string()
      .min(1)
      .regex(/^[a-z][a-z0-9_.]*$/, 'Key must be lowercase alphanumeric with underscores or dots'),
    group: z.string().min(1),
    label: z.string().min(1).max(100),
    type: z.enum(META_FIELD_TYPES as unknown as [MetaFieldType, ...MetaFieldType[]]),
    required: z.boolean().default(false),
    localized: z.boolean().default(false),
    isSystem: z.boolean().default(false),
    unique: z.boolean().default(false),
    searchable: z.boolean().default(false),
    filterable: z.boolean().default(false),
    sortable: z.boolean().default(false),
    hidden: z.boolean().default(false),
    readOnly: z.boolean().default(false),
    defaultValue: z.unknown().optional(),
    validation: validationRulesSchema.optional(),
    conditional: z.array(conditionalRuleSchema).optional(),
    settings: fieldSettingsSchema
      .extend({
        repeater: z
          .object({
            minItems: z.number().int().min(0).optional(),
            maxItems: z.number().int().min(0).optional(),
            fields: z.array(metaFieldDefinitionSchema),
          })
          .optional(),
      })
      .optional(),
    order: z.number().int().min(0).default(0),
  }),
);

export const metaFieldGroupSchema = z.object({
  key: z
    .string()
    .min(1)
    .regex(/^[a-z][a-z0-9_]*$/, 'Group key must be lowercase alphanumeric'),
  label: z.string().min(1).max(100),
  isSystem: z.boolean().default(false),
  order: z.number().int().min(0).default(0),
});

export type MetaFieldGroup = z.infer<typeof metaFieldGroupSchema>;

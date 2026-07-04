import { z } from 'zod';
import type { MetaFieldDefinition } from './field-definition';
import { collectConditionalRules, getVisibleFieldKeys, stripHiddenFields } from './conditional';
import { entityReferenceSchema } from '../entity/entity-reference';

function buildFieldZodSchema(field: MetaFieldDefinition): z.ZodTypeAny {
  const rules = field.validation;
  let schema: z.ZodTypeAny;

  switch (field.type) {
    case 'text':
    case 'code':
      schema = z.string();
      if (rules?.minLength) schema = (schema as z.ZodString).min(rules.minLength);
      if (rules?.maxLength) schema = (schema as z.ZodString).max(rules.maxLength);
      if (rules?.pattern) schema = (schema as z.ZodString).regex(new RegExp(rules.pattern));
      break;
    case 'rich_text':
      schema = z.string();
      break;
    case 'number':
      schema = z.number();
      if (rules?.min !== undefined) schema = (schema as z.ZodNumber).min(rules.min);
      if (rules?.max !== undefined) schema = (schema as z.ZodNumber).max(rules.max);
      break;
    case 'boolean':
      schema = z.boolean();
      break;
    case 'date':
      schema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
      break;
    case 'datetime':
      schema = z.string().datetime({ offset: true }).or(z.string().datetime());
      break;
    case 'url':
      schema = z.string().url();
      break;
    case 'json':
      schema = z.union([z.record(z.unknown()), z.array(z.unknown())]);
      break;
    case 'image':
    case 'file':
      schema = z.string().min(1);
      break;
    case 'gallery':
      schema = z.array(z.string());
      break;
    case 'relation': {
      const cardinality = field.settings?.relation?.cardinality ?? 'one';
      schema = cardinality === 'many' ? z.array(z.string()) : z.string();
      break;
    }
    case 'entity_reference': {
      const cardinality = field.settings?.entityReference?.cardinality ?? 'one';
      schema = cardinality === 'many' ? z.array(entityReferenceSchema) : entityReferenceSchema;
      break;
    }
    case 'repeater': {
      const subFields = field.settings?.repeater?.fields ?? [];
      const itemSchema = buildEntryShape(subFields);
      let arr = z.array(itemSchema);
      if (field.settings?.repeater?.minItems !== undefined) {
        arr = arr.min(field.settings.repeater.minItems);
      }
      if (field.settings?.repeater?.maxItems !== undefined) {
        arr = arr.max(field.settings.repeater.maxItems);
      }
      schema = arr;
      break;
    }
    default:
      schema = z.unknown();
  }

  if (field.required) {
    return schema;
  }
  return schema.optional().nullable();
}

function buildEntryShape(fields: MetaFieldDefinition[]): z.ZodObject<z.ZodRawShape> {
  const shape: z.ZodRawShape = {};
  const topLevel: Record<string, MetaFieldDefinition[]> = {};

  for (const field of fields) {
    const parts = field.key.split('.');
    if (parts.length === 1) {
      shape[field.key] = buildFieldZodSchema(field);
    } else {
      const top = parts[0]!;
      if (!topLevel[top]) topLevel[top] = [];
      topLevel[top].push({ ...field, key: parts.slice(1).join('.'), group: field.group });
    }
  }

  for (const [top, nestedFields] of Object.entries(topLevel)) {
    shape[top] = buildEntryShape(nestedFields);
  }

  return z.object(shape).passthrough();
}

export function buildEntrySchema(fields: MetaFieldDefinition[]): z.ZodObject<z.ZodRawShape> {
  return buildEntryShape(fields);
}

export function validateEntryData(
  fields: MetaFieldDefinition[],
  data: Record<string, unknown>,
): { success: true; data: Record<string, unknown> } | { success: false; error: z.ZodError } {
  const rules = collectConditionalRules(fields);
  const allKeys = fields.map((f) => f.key);
  const visibleKeys = getVisibleFieldKeys(allKeys, rules, data);
  const visibleFields = fields.filter((f) => visibleKeys.has(f.key));

  const stripped = stripHiddenFields(data, allKeys, rules);
  const schema = buildEntrySchema(visibleFields);
  const result = schema.safeParse(stripped);

  if (!result.success) {
    return { success: false, error: result.error };
  }

  return { success: true, data: result.data as Record<string, unknown> };
}

import type { MetaFieldDefinition, MetaFieldGroup } from '../meta/field-definition';

export const SYSTEM_GROUP_KEY = 'system';

export function defaultSystemFieldGroup(): MetaFieldGroup {
  return {
    key: SYSTEM_GROUP_KEY,
    label: 'System',
    isSystem: true,
    order: 9998,
  };
}

export function defaultSystemFields(): MetaFieldDefinition[] {
  return [
    {
      key: 'system.notes',
      group: SYSTEM_GROUP_KEY,
      label: 'Internal Notes',
      type: 'rich_text',
      isSystem: true,
      hidden: true,
      readOnly: false,
      order: 0,
    },
    {
      key: 'system.externalId',
      group: SYSTEM_GROUP_KEY,
      label: 'External ID',
      type: 'text',
      isSystem: true,
      hidden: true,
      unique: true,
      searchable: true,
      filterable: true,
      order: 1,
    },
  ];
}

export function mergeWithDefaultSystemFields(
  fieldGroups: MetaFieldGroup[],
  fields: MetaFieldDefinition[],
): { fieldGroups: MetaFieldGroup[]; fields: MetaFieldDefinition[] } {
  const systemGroup = defaultSystemFieldGroup();
  const systemFields = defaultSystemFields();

  const hasSystemGroup = fieldGroups.some((g) => g.key === SYSTEM_GROUP_KEY);
  const mergedGroups = hasSystemGroup ? fieldGroups : [...fieldGroups, systemGroup];

  const userFieldKeys = new Set(fields.map((f) => f.key));
  const mergedFields = [...fields];
  for (const systemField of systemFields) {
    if (!userFieldKeys.has(systemField.key)) {
      mergedFields.push(systemField);
    }
  }

  return { fieldGroups: mergedGroups, fields: mergedFields };
}

export function ensureSystemGroupOnUpdate(
  fieldGroups: MetaFieldGroup[],
  fields: MetaFieldDefinition[],
): { fieldGroups: MetaFieldGroup[]; fields: MetaFieldDefinition[] } {
  return mergeWithDefaultSystemFields(fieldGroups, fields);
}

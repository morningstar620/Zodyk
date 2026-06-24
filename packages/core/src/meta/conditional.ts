import type { ConditionalRule } from './field-definition';

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

function evaluateCondition(
  data: Record<string, unknown>,
  operator: ConditionalRule['when']['operator'],
  field: string,
  expected?: unknown,
): boolean {
  const value = getNestedValue(data, field);

  switch (operator) {
    case 'equals':
      return value === expected;
    case 'not_equals':
      return value !== expected;
    case 'contains':
      return typeof value === 'string' && typeof expected === 'string' && value.includes(expected);
    case 'empty':
      return value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0);
    case 'not_empty':
      return !(value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0));
    case 'gt':
      return typeof value === 'number' && typeof expected === 'number' && value > expected;
    case 'lt':
      return typeof value === 'number' && typeof expected === 'number' && value < expected;
    default:
      return true;
  }
}

export function getVisibleFieldKeys(
  allFieldKeys: string[],
  rules: ConditionalRule[],
  data: Record<string, unknown>,
): Set<string> {
  const hidden = new Set<string>();
  const shown = new Set<string>();

  for (const rule of rules) {
    const matches = evaluateCondition(data, rule.when.operator, rule.when.field, rule.when.value);
    if (!matches) continue;

    for (const target of rule.targets) {
      if (rule.action === 'hide') hidden.add(target);
      if (rule.action === 'show') shown.add(target);
    }
  }

  if (shown.size > 0) {
    return new Set([...shown].filter((k) => allFieldKeys.includes(k)));
  }

  return new Set(allFieldKeys.filter((k) => !hidden.has(k)));
}

export function collectConditionalRules(
  fields: { key: string; conditional?: ConditionalRule[] }[],
): ConditionalRule[] {
  return fields.flatMap((f) => f.conditional ?? []);
}

export function stripHiddenFields(
  data: Record<string, unknown>,
  allFieldKeys: string[],
  rules: ConditionalRule[],
): Record<string, unknown> {
  const visible = getVisibleFieldKeys(allFieldKeys, rules, data);
  const result: Record<string, unknown> = {};

  for (const key of visible) {
    const value = getNestedValue(data, key);
    if (value !== undefined) {
      setNestedValue(result, key, value);
    }
  }

  return result;
}

function setNestedValue(obj: Record<string, unknown>, path: string, value: unknown): void {
  const parts = path.split('.');
  let current = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i]!;
    if (!(part in current) || typeof current[part] !== 'object') {
      current[part] = {};
    }
    current = current[part] as Record<string, unknown>;
  }
  current[parts[parts.length - 1]!] = value;
}

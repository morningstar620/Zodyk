import type { DiagnosticIssue } from '../types';

export function flattenLocaleJson(obj: Record<string, unknown>, prefix = ''): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(result, flattenLocaleJson(value as Record<string, unknown>, fullKey));
    } else {
      result[fullKey] = String(value);
    }
  }
  return result;
}

export function parseLocaleJsonDiagnostics(content: string): DiagnosticIssue[] {
  try {
    JSON.parse(content);
    return [];
  } catch (error) {
    return [{
      line: 1,
      message: error instanceof SyntaxError ? error.message : 'Invalid JSON',
      severity: 'error',
      source: 'locale',
    }];
  }
}

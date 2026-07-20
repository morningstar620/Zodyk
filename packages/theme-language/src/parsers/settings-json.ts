import { themeSettingsSchemaSchema } from '@zodyk/core';
import type { DiagnosticIssue, ThemeWorkspaceSnapshot } from '../types';

export function parseSettingsSchemaDiagnostics(content: string): DiagnosticIssue[] {
  try {
    const parsed = JSON.parse(content) as unknown;
    const result = themeSettingsSchemaSchema.safeParse(parsed);
    if (result.success) return [];
    return result.error.issues.map((issue) => ({
      line: 1,
      message: `${issue.path.join('.')}: ${issue.message}`,
      severity: 'error' as const,
      source: 'settings-schema',
      code: issue.code,
    }));
  } catch (error) {
    return [{
      line: 1,
      message: error instanceof SyntaxError ? error.message : 'Invalid JSON',
      severity: 'error',
      source: 'settings-schema',
    }];
  }
}

export function parseSettingsValuesDiagnostics(
  content: string,
  workspace: ThemeWorkspaceSnapshot,
): DiagnosticIssue[] {
  try {
    const parsed = JSON.parse(content) as { current?: Record<string, unknown> };
    const issues: DiagnosticIssue[] = [];
    const knownIds = new Set<string>();
    for (const group of workspace.settingsSchema) {
      for (const setting of group.settings) {
        if (setting.id) knownIds.add(setting.id);
      }
    }
    const current = parsed.current ?? parsed;
    if (typeof current === 'object' && current !== null) {
      for (const key of Object.keys(current)) {
        if (!knownIds.has(key)) {
          issues.push({
            line: 1,
            message: `Unknown setting key "${key}"`,
            severity: 'warning',
            source: 'settings',
            code: 'unknown_setting_key',
          });
        }
      }
    }
    return issues;
  } catch (error) {
    return [{
      line: 1,
      message: error instanceof SyntaxError ? error.message : 'Invalid JSON',
      severity: 'error',
      source: 'settings',
    }];
  }
}

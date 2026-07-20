import type { DiagnosticIssue, ThemeWorkspaceSnapshot } from '../types';
import { resolveFileKind } from '../workspace/file-context';
import { parseLiquidDiagnostics } from './liquid-document';
import { parseSchemaBlockDiagnostics } from './schema-block';
import { parseTemplateJsonDiagnostics } from './template-json';
import { parseSettingsSchemaDiagnostics, parseSettingsValuesDiagnostics } from './settings-json';
import { parseLocaleJsonDiagnostics } from './locale-json';
import { getCachedDiagnostics, setCachedDiagnostics } from '../cache/parse-cache';

export function parseFileDiagnostics(
  path: string,
  content: string,
  workspace: ThemeWorkspaceSnapshot,
): DiagnosticIssue[] {
  const cached = getCachedDiagnostics(path, content);
  if (cached) return cached;

  const kind = resolveFileKind(path);
  const issues: DiagnosticIssue[] = [];

  if (path.endsWith('.liquid')) {
    issues.push(...parseLiquidDiagnostics(content, path));
    if (kind === 'section') {
      issues.push(...parseSchemaBlockDiagnostics(content));
    }
    issues.push(...parseCrossFileLiquidDiagnostics(path, content, workspace));
  }

  if (kind === 'template' && path.endsWith('.json')) {
    issues.push(...parseTemplateJsonDiagnostics(content, workspace));
  }

  if (path === 'config/settings_schema.json') {
    issues.push(...parseSettingsSchemaDiagnostics(content));
  }

  if (path === 'config/settings.json') {
    issues.push(...parseSettingsValuesDiagnostics(content, workspace));
  }

  if (kind === 'locale') {
    issues.push(...parseLocaleJsonDiagnostics(content));
  }

  for (const health of workspace.healthIssues) {
    if (health.sectionType && path.includes(health.sectionType)) {
      issues.push({
        line: 1,
        message: health.message,
        severity: health.severity,
        source: 'health',
        code: health.code,
      });
    }
  }

  setCachedDiagnostics(path, content, issues);
  return issues;
}

function parseCrossFileLiquidDiagnostics(
  path: string,
  content: string,
  workspace: ThemeWorkspaceSnapshot,
): DiagnosticIssue[] {
  const issues: DiagnosticIssue[] = [];
  const renderRegex = /\{%-?\s*(?:render|include)\s+['"]([^'"]+)['"]/g;
  let match: RegExpExecArray | null;
  while ((match = renderRegex.exec(content)) !== null) {
    const snippet = match[1]!;
    const snippetPath = `snippets/${snippet}.liquid`;
    if (!workspace.files[snippetPath]) {
      const line = content.slice(0, match.index).split('\n').length;
      issues.push({
        line,
        message: `Snippet "${snippet}" not found`,
        severity: 'error',
        source: 'cross-file',
        code: 'missing_snippet',
      });
    }
  }
  return issues;
}

export * from './liquid-document';
export * from './schema-block';
export * from './template-json';
export * from './settings-json';
export * from './locale-json';

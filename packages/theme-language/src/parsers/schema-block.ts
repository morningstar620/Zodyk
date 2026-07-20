import { sectionDefinitionSchema } from '@zodyk/core';
import { splitSectionLiquid } from '@zodyk/liquid';
import type { DiagnosticIssue } from '../types';
import { findSchemaBlockRegion, offsetToPosition } from './liquid-document';

export function parseSchemaBlockDiagnostics(content: string): DiagnosticIssue[] {
  const { schemaJson } = splitSectionLiquid(content);
  if (!schemaJson) return [];

  const region = findSchemaBlockRegion(content);
  const lineOffset = region ? region.startLine - 1 : 0;

  try {
    const raw = JSON.parse(schemaJson) as unknown;
    const result = sectionDefinitionSchema.safeParse(raw);
    if (result.success) return [];

    return result.error.issues.map((issue) => {
      const path = issue.path.join('.');
      const searchKey = `"${String(issue.path[issue.path.length - 1] ?? '')}"`;
      const idx = schemaJson.indexOf(searchKey);
      const pos = idx >= 0 ? offsetToPosition(schemaJson, idx) : { line: 1, column: 1 };
      return {
        line: lineOffset + pos.line,
        column: pos.column,
        message: path ? `${path}: ${issue.message}` : issue.message,
        severity: 'error' as const,
        source: 'schema',
        code: issue.code,
      };
    });
  } catch (error) {
    const message = error instanceof SyntaxError ? error.message : 'Invalid JSON in schema block';
    let line = lineOffset + 1;
    const match = message.match(/position (\d+)/);
    if (match?.[1]) {
      const pos = offsetToPosition(schemaJson, Number(match[1]));
      line = lineOffset + pos.line;
    }
    return [{ line, message, severity: 'error', source: 'schema' }];
  }
}

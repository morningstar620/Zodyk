import { templateJsonSchema, type TemplateJson } from '@zodyk/core';
import type { DiagnosticIssue, ThemeWorkspaceSnapshot } from '../types';

export function parseTemplateJsonDiagnostics(
  content: string,
  workspace: ThemeWorkspaceSnapshot,
): DiagnosticIssue[] {
  const issues: DiagnosticIssue[] = [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch (error) {
    const message = error instanceof SyntaxError ? error.message : 'Invalid JSON';
    return [{ line: 1, message, severity: 'error', source: 'template' }];
  }

  const result = templateJsonSchema.safeParse(parsed);
  if (!result.success) {
    for (const issue of result.error.issues) {
      issues.push({
        line: 1,
        message: `${issue.path.join('.')}: ${issue.message}`,
        severity: 'error',
        source: 'template',
        code: issue.code,
      });
    }
  }

  const template = parsed as TemplateJson;
  if (template?.sections) {
    for (const [id, section] of Object.entries(template.sections)) {
      if (!workspace.sectionTypes.includes(section.type)) {
        issues.push({
          line: 1,
          message: `Section "${id}" references unknown type "${section.type}"`,
          severity: 'error',
          source: 'template',
          code: 'unknown_section_type',
        });
      }
      const schema = workspace.sectionSchemas[section.type];
      if (schema && section.blocks) {
        for (const [blockId, block] of Object.entries(section.blocks)) {
          const blockDef = schema.blocks.find((b) => b.type === block.type);
          if (!blockDef) {
            issues.push({
              line: 1,
              message: `Block "${blockId}" in section "${id}" has unknown type "${block.type}"`,
              severity: 'error',
              source: 'template',
              code: 'unknown_block_type',
            });
          }
        }
      }
    }
  }

  return issues;
}

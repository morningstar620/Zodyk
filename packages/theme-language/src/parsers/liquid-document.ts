import { Liquid } from 'liquidjs';
import { splitSectionLiquid } from '@zodyk/liquid';
import type { DiagnosticIssue } from '../types';
import { getCachedSplit, setCachedSplit } from '../cache/parse-cache';

let sharedEngine: Liquid | null = null;

function getEngine(): Liquid {
  if (!sharedEngine) {
    sharedEngine = new Liquid({ strictFilters: false, strictVariables: false });
  }
  return sharedEngine;
}

function cachedSplit(content: string, path = '') {
  if (path) {
    const cached = getCachedSplit(path, content);
    if (cached) return cached;
  }
  const result = splitSectionLiquid(content);
  if (path) setCachedSplit(path, content, result);
  return result;
}

export interface SchemaBlockRegion {
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
  json: string;
  jsonStartOffset: number;
}

export function findSchemaBlockRegion(content: string, path = ''): SchemaBlockRegion | null {
  const { schemaJson } = cachedSplit(content, path);
  if (!schemaJson) return null;

  const openMatch = content.match(/\{%\s*-?\s*schema\s*-?\s*%\}/i);
  if (!openMatch || openMatch.index === undefined) return null;

  const jsonStartOffset = content.indexOf(schemaJson, openMatch.index);
  if (jsonStartOffset < 0) return null;

  const beforeJson = content.slice(0, jsonStartOffset);
  const startLine = beforeJson.split('\n').length;
  const startColumn = jsonStartOffset - beforeJson.lastIndexOf('\n');

  const jsonEndOffset = jsonStartOffset + schemaJson.length;
  const beforeEnd = content.slice(0, jsonEndOffset);
  const endLine = beforeEnd.split('\n').length;
  const endColumn = jsonEndOffset - beforeEnd.lastIndexOf('\n');

  return {
    startLine,
    startColumn,
    endLine,
    endColumn,
    json: schemaJson,
    jsonStartOffset,
  };
}

export function parseLiquidDiagnostics(content: string, filePath: string): DiagnosticIssue[] {
  const { markup } = cachedSplit(content, filePath);
  const trimmed = markup.trim();
  if (!trimmed) return [];

  try {
    getEngine().parse(trimmed, filePath);
    return [];
  } catch (error) {
    if (error && typeof error === 'object' && 'token' in error) {
      const token = (error as { token?: { begin: number; end: number }; message?: string }).token;
      const message =
        (error as { message?: string }).message ?? 'Liquid syntax error';
      if (token?.begin !== undefined) {
        const line = content.slice(0, token.begin).split('\n').length;
        const col = token.begin - content.lastIndexOf('\n', token.begin);
        return [{ line, column: col, message, severity: 'error', source: 'liquid' }];
      }
    }
    return [{ line: 1, message: String(error), severity: 'error', source: 'liquid' }];
  }
}

export function offsetToPosition(content: string, offset: number): { line: number; column: number } {
  const before = content.slice(0, offset);
  return {
    line: before.split('\n').length,
    column: offset - before.lastIndexOf('\n'),
  };
}

export function positionToOffset(content: string, line: number, column: number): number {
  const lines = content.split('\n');
  let offset = 0;
  for (let i = 0; i < line - 1 && i < lines.length; i++) {
    offset += lines[i]!.length + 1;
  }
  return offset + column;
}

export function isInsideSchemaBlock(content: string, offset: number): boolean {
  const region = findSchemaBlockRegion(content);
  if (!region) return false;
  return offset >= region.jsonStartOffset && offset <= region.jsonStartOffset + region.json.length;
}

export function getLineAtOffset(content: string, offset: number): string {
  const lineStart = content.lastIndexOf('\n', offset - 1) + 1;
  const lineEnd = content.indexOf('\n', offset);
  return content.slice(lineStart, lineEnd === -1 ? undefined : lineEnd);
}

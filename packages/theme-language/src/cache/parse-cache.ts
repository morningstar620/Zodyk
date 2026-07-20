import type { DiagnosticIssue } from '../types';

export interface SplitSectionResult {
  markup: string;
  schemaJson: string | null;
}

interface ParseCacheEntry {
  split?: SplitSectionResult;
  diagnostics?: DiagnosticIssue[];
}

const MAX_ENTRIES = 500;
const cache = new Map<string, ParseCacheEntry>();
const accessOrder: string[] = [];

export function hashContent(content: string): string {
  let hash = 5381;
  for (let i = 0; i < content.length; i++) {
    hash = (hash * 33) ^ content.charCodeAt(i);
  }
  return (hash >>> 0).toString(36);
}

function cacheKey(path: string, content: string): string {
  return `${path}:${hashContent(content)}`;
}

function touch(key: string): void {
  const idx = accessOrder.indexOf(key);
  if (idx >= 0) accessOrder.splice(idx, 1);
  accessOrder.push(key);
  while (accessOrder.length > MAX_ENTRIES) {
    const evict = accessOrder.shift();
    if (evict) cache.delete(evict);
  }
}

export function getCachedSplit(path: string, content: string): SplitSectionResult | undefined {
  const key = cacheKey(path, content);
  const entry = cache.get(key);
  if (!entry?.split) return undefined;
  touch(key);
  return entry.split;
}

export function setCachedSplit(path: string, content: string, split: SplitSectionResult): void {
  const key = cacheKey(path, content);
  const entry = cache.get(key) ?? {};
  entry.split = split;
  cache.set(key, entry);
  touch(key);
}

export function getCachedDiagnostics(path: string, content: string): DiagnosticIssue[] | undefined {
  const key = cacheKey(path, content);
  const entry = cache.get(key);
  if (!entry?.diagnostics) return undefined;
  touch(key);
  return entry.diagnostics;
}

export function setCachedDiagnostics(
  path: string,
  content: string,
  diagnostics: DiagnosticIssue[],
): void {
  const key = cacheKey(path, content);
  const entry = cache.get(key) ?? {};
  entry.diagnostics = diagnostics;
  cache.set(key, entry);
  touch(key);
}

export function invalidateParseCacheForPath(path: string): void {
  const prefix = `${path}:`;
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) {
      cache.delete(key);
      const idx = accessOrder.indexOf(key);
      if (idx >= 0) accessOrder.splice(idx, 1);
    }
  }
}

export function clearParseCache(): void {
  cache.clear();
  accessOrder.length = 0;
}

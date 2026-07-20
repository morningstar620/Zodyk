import { describe, expect, it } from 'vitest';
import {
  getCachedDiagnostics,
  getCachedSplit,
  hashContent,
  invalidateParseCacheForPath,
  setCachedDiagnostics,
  setCachedSplit,
} from './parse-cache';

describe('parse-cache', () => {
  it('returns stable hash for same content', () => {
    expect(hashContent('hello')).toBe(hashContent('hello'));
    expect(hashContent('hello')).not.toBe(hashContent('world'));
  });

  it('caches and retrieves split results', () => {
    const path = 'sections/hero.liquid';
    const content = '<div>{% schema %}{}{% endschema %}</div>';
    const split = { markup: '<div></div>', schemaJson: '{}' };
    setCachedSplit(path, content, split);
    expect(getCachedSplit(path, content)).toEqual(split);
  });

  it('caches and retrieves diagnostics', () => {
    const path = 'snippets/foo.liquid';
    const content = '{{ x }}';
    const diagnostics = [{ line: 1, message: 'test', severity: 'error' as const }];
    setCachedDiagnostics(path, content, diagnostics);
    expect(getCachedDiagnostics(path, content)).toEqual(diagnostics);
  });

  it('invalidates cache entries for a path', () => {
    const path = 'templates/index.json';
    const content = '{}';
    setCachedDiagnostics(path, content, [{ line: 1, message: 'x', severity: 'warning' }]);
    invalidateParseCacheForPath(path);
    expect(getCachedDiagnostics(path, content)).toBeUndefined();
  });
});

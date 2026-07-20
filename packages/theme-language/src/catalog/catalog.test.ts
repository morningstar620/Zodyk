import { describe, expect, it } from 'vitest';
import { getAllTags, getAllFilters } from '../catalog/index';
import { resolveFileKind, sectionTypeFromPath } from '../workspace/file-context';
import { parseSchemaBlockDiagnostics } from '../parsers/schema-block';
import { flattenLocaleJson } from '../parsers/locale-json';

describe('catalog', () => {
  it('includes Zodyk tags', () => {
    const tags = getAllTags().map((t) => t.name);
    expect(tags).toContain('render');
    expect(tags).toContain('stylesheet_tag');
  });

  it('includes Zodyk filters', () => {
    const filters = getAllFilters().map((f) => f.name);
    expect(filters).toContain('asset_url');
    expect(filters).toContain('t');
  });
});

describe('file-context', () => {
  it('resolves section type from path', () => {
    expect(resolveFileKind('sections/hero.liquid')).toBe('section');
    expect(sectionTypeFromPath('sections/hero.liquid')).toBe('hero');
  });
});

describe('schema-block parser', () => {
  it('reports invalid schema JSON', () => {
    const content = `<div></div>\n{% schema %}\n{ invalid }\n{% endschema %}`;
    const issues = parseSchemaBlockDiagnostics(content);
    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0]?.severity).toBe('error');
  });
});

describe('locale parser', () => {
  it('flattens nested locale keys', () => {
    const flat = flattenLocaleJson({ general: { title: 'Hello' } });
    expect(flat['general.title']).toBe('Hello');
  });
});

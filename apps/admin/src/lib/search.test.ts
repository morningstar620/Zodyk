import { describe, expect, it } from 'vitest';
import { normalizeSearchQuery, searchHref } from './search';

describe('search helpers', () => {
  it('trims and normalizes a query', () => {
    expect(normalizeSearchQuery('  pricing page  ')).toBe('pricing page');
    expect(normalizeSearchQuery(null)).toBe('');
  });

  it('builds an encoded search URL', () => {
    expect(searchHref('  pricing & plans  ')).toBe('/search?q=pricing%20%26%20plans');
  });

  it('returns the bare search page for an empty query', () => {
    expect(searchHref('   ')).toBe('/search');
  });
});

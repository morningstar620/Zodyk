import { describe, expect, it } from 'vitest';
import { escapeRegex } from '@zodyk/core';

describe('literal search patterns', () => {
  it.each(['(a+)+$', 'a.b', '[abc]', '\\', 'x|y', '^start$', '{2}'])(
    'matches %s as text instead of regex syntax',
    (value) => {
      const pattern = new RegExp(escapeRegex(value), 'i');
      expect(pattern.test(`prefix ${value} suffix`)).toBe(true);
      expect(pattern.test('aaaaaaaaaaaaaaaaaaaaaaaaaaaa!')).toBe(false);
    },
  );

  it('keeps case-insensitive substring search', () => {
    expect(new RegExp(escapeRegex('ann'), 'i').test('Annette')).toBe(true);
  });
});

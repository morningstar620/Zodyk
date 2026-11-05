import { describe, expect, it } from 'vitest';
import { safeCallbackUrl } from './safe-callback-url';

describe('safeCallbackUrl', () => {
  it.each([
    ['/pages', '/pages'],
    ['/pages?page=2', '/pages?page=2'],
    ['/settings/profile#security', '/settings/profile#security'],
    ['/pages/../settings', '/settings'],
    ['/', '/'],
  ])('keeps same-origin path %s', (input, expected) => {
    expect(safeCallbackUrl(input)).toBe(expected);
  });

  it.each([
    null,
    undefined,
    '',
    'pages',
    'https://evil.example/phish',
    'http://evil.example',
    '//evil.example',
    '///evil.example',
    '/\\evil.example',
    'javascript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
  ])('falls back to / for unsafe value %s', (input) => {
    expect(safeCallbackUrl(input)).toBe('/');
  });

  it('uses a supplied fallback', () => {
    expect(safeCallbackUrl('https://evil.example', '/dashboard')).toBe('/dashboard');
  });
});

import { describe, expect, it } from 'vitest';
import { menuItemsSchema } from '@zodyk/core';

function parse(items: unknown) {
  return menuItemsSchema.safeParse(items);
}

describe('menu URL validation', () => {
  it('accepts root-relative, absolute and fragment URLs', () => {
    const accepted = [
      '/',
      '/about',
      '/blog/hello-world',
      'https://example.com',
      'http://example.com/path?q=1',
      '#section',
    ];
    for (const url of accepted) {
      expect(parse([{ label: 'x', url, type: 'http' }]).success, url).toBe(true);
    }
  });

  it('rejects executable URL schemes', () => {
    const rejected = [
      'javascript:alert(1)',
      'JaVaScRiPt:alert(1)',
      'data:text/html,<script>alert(1)</script>',
      'vbscript:msgbox(1)',
      'ftp://example.com',
    ];
    for (const url of rejected) {
      expect(parse([{ label: 'x', url, type: 'http' }]).success, url).toBe(false);
    }
  });

  it('rejects protocol-relative and quote/angle-bracket payloads', () => {
    const rejected = [
      '//evil.example',
      '"><script>alert(1)</script>',
      '\\"><script>alert(1)</script>',
      '/path"onload="alert(1)',
      '/path onload=alert(1)',
    ];
    for (const url of rejected) {
      expect(parse([{ label: 'x', url, type: 'http' }]).success, url).toBe(false);
    }
  });

  it('validates nested items', () => {
    const result = parse([
      {
        label: 'Parent',
        url: '/',
        type: 'home',
        items: [{ label: 'Child', url: 'javascript:alert(1)', type: 'http' }],
      },
    ]);
    expect(result.success).toBe(false);
  });

  it('keeps the existing depth and handle rules working', () => {
    const deep = [
      {
        label: 'a',
        url: '/',
        type: 'home',
        items: [
          {
            label: 'b',
            url: '/',
            type: 'home',
            items: [
              {
                label: 'c',
                url: '/',
                type: 'home',
                items: [{ label: 'd', url: '/', type: 'home', items: [] }],
              },
            ],
          },
        ],
      },
    ];
    expect(parse(deep).success).toBe(false);
  });
});

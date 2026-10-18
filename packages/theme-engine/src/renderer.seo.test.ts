import { describe, expect, it } from 'vitest';
import { renderThemedPage } from './renderer';

describe('content_for_header', () => {
  it('passes prebuilt head tags through to the layout', async () => {
    const header = '<meta name="description" content="Company story">';
    const { html } = await renderThemedPage(
      {
        'layout/theme.liquid': `<!DOCTYPE html><html><head><title>{{ page.title }}</title>{{ content_for_header }}</head><body>{{ content_for_layout }}</body></html>`,
        'templates/page.json': JSON.stringify({ sections: {}, order: [] }),
      },
      {
        view: 'page',
        context: {
          shop: { name: 'Example', url: 'https://example.com', currency: 'USD' },
          request: { path: '/about', locale: 'en' },
          settings: {},
          page: {
            id: '1',
            title: 'About',
            handle: 'about',
            slug: 'about',
          },
          content_for_header: header,
        },
      },
    );

    expect(html).toContain(header);
    expect(html).toContain('<title>About</title>');
  });
});

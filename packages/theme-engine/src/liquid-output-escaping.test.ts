import { describe, expect, it } from 'vitest';
import {
  SafeString,
  createLiquidEngine,
  escapeHtmlOutput,
  renderLayout,
  renderSection,
} from '@zodyk/liquid';
import type { SectionInstance } from '@zodyk/core';

function engineWith(files: Record<string, string>) {
  return createLiquidEngine({ files });
}

describe('output escaping', () => {
  it('escapes author-controlled output', async () => {
    const { engine } = engineWith({});
    const html = await engine.parseAndRender('{{ title }}', {
      title: '<script>alert(1)</script>',
    });
    expect(html).toBe('&lt;script&gt;alert(1)&lt;/script&gt;');
  });

  it('escapes quotes and ampersands too', () => {
    expect(escapeHtmlOutput(`"'><&`)).toBe('&quot;&#39;&gt;&lt;&amp;');
  });

  it('does not escape values explicitly marked safe', async () => {
    const { engine } = engineWith({});
    const html = await engine.parseAndRender('{{ html }}', {
      html: new SafeString('<b>safe</b>'),
    });
    expect(html).toBe('<b>safe</b>');
  });

  it('keeps stylesheet_tag/script_tag filters as real HTML', async () => {
    const { engine } = engineWith({});
    await expect(
      engine.parseAndRender('{{ "theme.css" | asset_url | stylesheet_tag }}', {}),
    ).resolves.toBe('<link rel="stylesheet" href="/assets/theme.css">');
    await expect(
      engine.parseAndRender('{{ "theme.js" | asset_url | script_tag }}', {}),
    ).resolves.toBe('<script src="/assets/theme.js" defer></script>');
  });

  it('keeps zodyk_block_attributes as real attributes', async () => {
    const { engine } = engineWith({});
    const html = await engine.parseAndRender('{{ block | zodyk_block_attributes: sectionId }}', {
      block: { id: 'b1' },
      sectionId: 's1',
    });
    expect(html).toBe('class="zodyk-block" data-block-id="b1" data-section-id="s1"');
  });

  it('does not escape content_for_layout or content_for_header', async () => {
    const { engine, fileMap } = engineWith({
      'layout/theme.liquid':
        '<head>{{ content_for_header }}</head><body>{{ content_for_layout }}</body>',
    });
    const html = await renderLayout(engine, fileMap, 'layout/theme.liquid', '<p>page</p>', {
      content_for_header: '<meta name="x">',
    });
    expect(html).toBe(
      '<head><meta name="x"></head><body><div id="zodyk-page" data-zodyk-page><p>page</p></div></body>',
    );
  });

  it('sanitises settings.custom_css instead of entity-encoding it', async () => {
    const { engine, fileMap } = engineWith({
      'layout/theme.liquid': '<style>{{ settings.custom_css }}</style>',
    });
    const html = await renderLayout(engine, fileMap, 'layout/theme.liquid', '', {
      settings: { custom_css: 'a > b { color: red } </sty</stylele><script>alert(1)</script>' },
    });
    expect(html).toContain('<style>');
    expect(html).toContain('a > b { color: red }');
    expect(html.toLowerCase()).not.toContain('</style><script');
    expect(html.endsWith('</style>')).toBe(true);
  });

  it('still escapes section settings', async () => {
    const instance: SectionInstance = {
      type: 'heading',
      settings: { text: '<img src=x onerror=alert(1)>' },
    };
    const { engine, fileMap } = engineWith({
      'sections/heading.liquid': '<h2>{{ section.settings.text }}</h2>',
    });
    const html = await renderSection(engine, fileMap, {
      sectionId: 's1',
      instance,
      context: {},
    });
    expect(html).not.toContain('<img src=x');
    expect(html).toContain('&lt;img src=x');
  });
});

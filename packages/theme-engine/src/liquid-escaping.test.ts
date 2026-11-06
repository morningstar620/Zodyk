import { describe, expect, it } from 'vitest';
import { createLiquidEngine, escapeHtmlAttribute, safeAssetUrl } from '@zodyk/liquid';

async function render(template: string, context: Record<string, unknown> = {}): Promise<string> {
  const { engine } = createLiquidEngine({ files: {} });
  return engine.parseAndRender(template, context);
}

describe('safeAssetUrl', () => {
  it('allows root-relative and http(s) URLs', () => {
    expect(safeAssetUrl('/assets/theme.css')).toBe('/assets/theme.css');
    expect(safeAssetUrl('https://cdn.example.com/theme.css')).toBe(
      'https://cdn.example.com/theme.css',
    );
    expect(safeAssetUrl('http://cdn.example.com/theme.css')).toBe(
      'http://cdn.example.com/theme.css',
    );
  });

  it('rejects schemes and paths that can execute or break out of an attribute', () => {
    expect(safeAssetUrl('javascript:alert(1)')).toBeNull();
    expect(safeAssetUrl('data:text/html,<script>alert(1)</script>')).toBeNull();
    expect(safeAssetUrl('//evil.example/theme.js')).toBeNull();
    expect(safeAssetUrl('/\\evil.example/theme.js')).toBeNull();
    expect(safeAssetUrl('theme.css')).toBeNull();
    expect(safeAssetUrl('"><script>alert(1)</script>')).toBeNull();
    expect(safeAssetUrl('https://example.com/"><script>alert(1)</script>')).toBeNull();
  });
});

describe('Liquid asset filters', () => {
  it('renders a normal root-relative stylesheet tag', async () => {
    expect(await render("{{ 'theme.css' | asset_url | stylesheet_tag }}")).toBe(
      '<link rel="stylesheet" href="/assets/theme.css">',
    );
  });

  it('renders a normal root-relative script tag', async () => {
    expect(await render("{{ 'theme.js' | asset_url | script_tag }}")).toBe(
      '<script src="/assets/theme.js" defer></script>',
    );
  });

  it('renders an https asset URL', async () => {
    expect(await render("{{ 'https://cdn.example.com/theme.css' | stylesheet_tag }}")).toBe(
      '<link rel="stylesheet" href="https://cdn.example.com/theme.css">',
    );
  });

  it.each([
    "{{ 'javascript:alert(1)' | script_tag }}",
    "{{ '//evil.example/theme.js' | script_tag }}",
    "{{ '/\\\\evil.example/theme.js' | script_tag }}",
    `{{ '"><script>alert(1)</script>' | script_tag }}`,
  ])('drops an unsafe script URL: %s', async (template) => {
    expect(await render(template)).toBe('');
  });

  it('drops an unsafe stylesheet URL', async () => {
    expect(await render(`{{ '"><script>alert(1)</script>' | stylesheet_tag }}`)).toBe('');
  });

  it('renders unsafe Liquid tags as nothing', async () => {
    expect(await render(`{% script_tag '"><script>alert(1)</script>' %}`)).toBe('');
    expect(await render(`{% stylesheet_tag '"><script>alert(1)</script>' %}`)).toBe('');
  });
});

describe('Liquid block attributes', () => {
  it('escapes block and section ids', async () => {
    const html = await render('{{ block | zodyk_block_attributes: section.id }}', {
      block: { id: 'b"><script>alert(1)</script>' },
      section: { id: 's"><img src=x onerror=alert(1)>' },
    });

    expect(html).not.toContain('<script>');
    expect(html).not.toContain('"><');
    expect(html).toContain('data-block-id="b&quot;&gt;&lt;script&gt;alert(1)&lt;/script&gt;"');
    expect(html).toContain('data-section-id="s&quot;&gt;&lt;img src=x onerror=alert(1)&gt;"');
  });

  it('keeps normal block attributes', async () => {
    expect(
      await render('{{ block | zodyk_block_attributes: section.id }}', {
        block: { id: 'block-1' },
        section: { id: 'section-1' },
      }),
    ).toBe('class="zodyk-block" data-block-id="block-1" data-section-id="section-1"');
  });
});

describe('escapeHtmlAttribute', () => {
  it('escapes every HTML attribute metacharacter', () => {
    expect(escapeHtmlAttribute(`&<>"'`)).toBe('&amp;&lt;&gt;&quot;&#39;');
  });
});

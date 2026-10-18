import { describe, expect, it } from 'vitest';
import {
  applyDocumentTitle,
  buildContentForHeader,
  buildPageBreadcrumbs,
  buildRobotsTxt,
  buildSitemapXml,
  collectSitemapEntries,
  composePageHead,
  escapeHtml,
  metaEntryPublicPath,
  normalizeRedirectPath,
  resolveRedirect,
} from './index';

describe('escapeHtml', () => {
  it('escapes characters that would break out of an attribute or tag', () => {
    expect(escapeHtml(`"><script>alert('x')</script>`)).toBe(
      '&quot;&gt;&lt;script&gt;alert(&#39;x&#39;)&lt;/script&gt;',
    );
    expect(escapeHtml('a & b')).toBe('a &amp; b');
  });
});

describe('buildContentForHeader', () => {
  it('emits title fields, description, canonical, and OG image', () => {
    const html = buildContentForHeader({
      title: 'About us',
      description: 'Company story',
      pageUrl: 'https://example.com/about',
      siteUrl: 'https://example.com',
      canonicalUrl: 'https://example.com/about',
      imageUrl: 'https://cdn.example.com/og.png',
      siteName: 'Example',
    });

    expect(html).toContain('<meta name="description" content="Company story">');
    expect(html).toContain('<link rel="canonical" href="https://example.com/about">');
    expect(html).toContain('<meta property="og:title" content="About us">');
    expect(html).toContain('<meta property="og:image" content="https://cdn.example.com/og.png">');
    expect(html).toContain('<meta name="twitter:card" content="summary_large_image">');
    expect(html).toContain('<meta name="twitter:image" content="https://cdn.example.com/og.png">');
    expect(html).toContain('"@type":"WebPage"');
  });

  it('HTML-escapes every injected value', () => {
    const html = buildContentForHeader({
      title: '"><script>',
      description: 'a "quote" & <tag>',
      pageUrl: 'https://example.com/about',
      siteUrl: 'https://example.com',
      imageUrl: 'https://cdn.example.com/a.png?x="1"',
      schemaOrg: { name: '</script><script>alert(1)</script>' },
    });

    expect(html).not.toContain('<script>alert');
    expect(html).toContain('content="&quot;&gt;&lt;script&gt;"');
    expect(html).toContain('content="a &quot;quote&quot; &amp; &lt;tag&gt;"');
    expect(html).toContain('content="https://cdn.example.com/a.png?x=&quot;1&quot;"');
    expect(html).toContain('\\u003c/script\\u003e');
    expect(html).not.toContain('</script><script>');
  });

  it('adds breadcrumb JSON-LD for hierarchical pages and omits it otherwise', () => {
    const withParent = composePageHead({
      siteUrl: 'https://example.com',
      siteName: 'Example',
      page: {
        id: 'child',
        title: 'Child',
        slug: 'child',
        parentId: 'parent',
        seo: {
          metaTitle: 'Child meta',
          metaDescription: 'Nested page',
          ogImage: 'https://cdn.example.com/child.png',
          canonicalUrl: 'https://example.com/child',
        },
      },
      pages: [
        { id: 'parent', title: 'Parent', slug: 'parent' },
        { id: 'child', title: 'Child', slug: 'child', parentId: 'parent' },
      ],
      imageUrl: 'https://cdn.example.com/child.png',
    });

    expect(withParent.documentTitle).toBe('Child meta');
    expect(withParent.header).toContain('"@type":"BreadcrumbList"');
    expect(withParent.header).toContain('"name":"Parent"');
    expect(withParent.header).toContain('"item":"https://example.com/parent"');
    expect(withParent.header).toContain('"item":"https://example.com/child"');
    expect(withParent.header).toContain('content="Nested page"');
    expect(withParent.header).toContain('content="https://cdn.example.com/child.png"');

    const topLevel = composePageHead({
      siteUrl: 'https://example.com',
      siteName: 'Example',
      page: { id: 'about', title: 'About', slug: 'about', seo: {} },
      pages: [{ id: 'about', title: 'About', slug: 'about' }],
    });
    expect(topLevel.header).not.toContain('BreadcrumbList');
  });

  it('stops breadcrumb walks on cycles', () => {
    const crumbs = buildPageBreadcrumbs({
      siteName: 'Example',
      page: { id: 'a', title: 'A', slug: 'a', parentId: 'b' },
      pages: [
        { id: 'a', title: 'A', slug: 'a', parentId: 'b' },
        { id: 'b', title: 'B', slug: 'b', parentId: 'a' },
      ],
    });
    expect(crumbs?.map((crumb) => crumb.name)).toEqual(['Example', 'B', 'A']);
  });
});

describe('applyDocumentTitle', () => {
  it('replaces the existing title and escapes it', () => {
    const html = applyDocumentTitle('<head><title>Old</title></head>', '</title><script>');
    expect(html).toBe('<head><title>&lt;/title&gt;&lt;script&gt;</title></head>');
  });
});

describe('sitemap', () => {
  it('lists published pages and public meta entries and skips noindex', () => {
    const entries = collectSitemapEntries({
      siteUrl: 'https://example.com',
      pages: [
        { slug: 'about', status: 'published', updatedAt: '2026-01-02T00:00:00.000Z' },
        { slug: 'secret', status: 'published', robots: 'noindex' },
        { slug: 'draft', status: 'draft' },
      ],
      metaEntries: [
        {
          handle: 'hello',
          definitionSlug: 'blog',
          singlePath: 'blog/:handle',
          status: 'published',
        },
        {
          handle: 'hidden',
          definitionSlug: 'blog',
          status: 'published',
          robots: 'noindex, nofollow',
        },
      ],
    });
    const xml = buildSitemapXml(entries);
    expect(xml).toContain('<loc>https://example.com/about</loc>');
    expect(xml).toContain('<loc>https://example.com/blog/hello</loc>');
    expect(xml).not.toContain('/secret');
    expect(xml).not.toContain('/draft');
    expect(xml).not.toContain('/hidden');
    expect(xml).toContain('<lastmod>2026-01-02T00:00:00.000Z</lastmod>');
  });

  it('escapes XML special characters in locations', () => {
    const xml = buildSitemapXml([{ loc: 'https://example.com/a?b=1&c=2' }]);
    expect(xml).toContain('<loc>https://example.com/a?b=1&amp;c=2</loc>');
  });
});

describe('metaEntryPublicPath', () => {
  it('fills the handle placeholder', () => {
    expect(metaEntryPublicPath('posts/:handle', 'posts', 'hello-world')).toBe('/posts/hello-world');
    expect(metaEntryPublicPath(undefined, 'posts', 'hello')).toBe('/posts/hello');
  });
});

describe('robots', () => {
  it('defaults to an allow-all file that points at the sitemap', () => {
    expect(buildRobotsTxt('  ', 'https://example.com/sitemap.xml')).toBe(
      'User-agent: *\nAllow: /\n\nSitemap: https://example.com/sitemap.xml\n',
    );
  });

  it('keeps an admin-authored file and appends the sitemap when missing', () => {
    expect(
      buildRobotsTxt('User-agent: *\nDisallow: /draft', 'https://example.com/sitemap.xml'),
    ).toBe('User-agent: *\nDisallow: /draft\n\nSitemap: https://example.com/sitemap.xml\n');
    expect(
      buildRobotsTxt(
        'Sitemap: https://cdn.example/sitemap.xml\n',
        'https://example.com/sitemap.xml',
      ),
    ).toBe('Sitemap: https://cdn.example/sitemap.xml\n');
  });
});

describe('resolveRedirect', () => {
  const rules = [
    { fromPath: '/old-page/', toPath: '/new-page', statusCode: 301 as const, enabled: true },
    { fromPath: '/temp', toPath: 'https://example.com/elsewhere', statusCode: 302 as const },
    { fromPath: '/off', toPath: '/somewhere', statusCode: 301 as const, enabled: false },
    { fromPath: '/loop', toPath: '/loop', statusCode: 301 as const },
  ];

  it('matches a normalized path and returns the status code', () => {
    expect(resolveRedirect('/old-page', rules)).toEqual({ location: '/new-page', statusCode: 301 });
    expect(resolveRedirect('/temp/', rules)).toEqual({
      location: 'https://example.com/elsewhere',
      statusCode: 302,
    });
  });

  it('ignores disabled rules and self-redirects', () => {
    expect(resolveRedirect('/off', rules)).toBeNull();
    expect(resolveRedirect('/loop', rules)).toBeNull();
    expect(resolveRedirect('/missing', rules)).toBeNull();
  });

  it('normalizes trailing slashes', () => {
    expect(normalizeRedirectPath('/old-page/')).toBe('/old-page');
    expect(normalizeRedirectPath('old-page')).toBe('/old-page');
  });
});

export interface BreadcrumbItem {
  name: string;
  url: string;
}

export interface JsonLdPage {
  title?: string;
  description?: string;
  url: string;
  imageUrl?: string;
}

export function buildWebPageJsonLd(page: JsonLdPage): Record<string, unknown> {
  const node: Record<string, unknown> = {
    '@type': 'WebPage',
    url: page.url,
  };
  if (page.title) node.name = page.title;
  if (page.description) node.description = page.description;
  if (page.imageUrl) node.image = page.imageUrl;
  return node;
}

export function buildBreadcrumbJsonLd(
  items: BreadcrumbItem[],
): Record<string, unknown> | undefined {
  if (items.length < 2) return undefined;
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export interface PageCrumbSource {
  id: string;
  title: string;
  slug: string;
  parentId?: string;
}

/**
 * Breadcrumb trail for a page that has a parent. Returns undefined for top-level pages.
 * Ancestor lookup stops on missing parents and cycles.
 */
export function buildPageBreadcrumbs(options: {
  page: PageCrumbSource;
  pages: PageCrumbSource[];
  siteName: string;
}): Array<{ name: string; path: string }> | undefined {
  const byId = new Map(options.pages.map((page) => [page.id, page]));
  const ancestors: PageCrumbSource[] = [];
  const seen = new Set<string>([options.page.id]);
  let parentId = options.page.parentId;

  while (parentId && !seen.has(parentId)) {
    const parent = byId.get(parentId);
    if (!parent) break;
    seen.add(parent.id);
    ancestors.unshift(parent);
    parentId = parent.parentId;
  }

  if (ancestors.length === 0) return undefined;

  return [
    { name: options.siteName || 'Home', path: '/' },
    ...ancestors.map((page) => ({ name: page.title, path: `/${encodeURIComponent(page.slug)}` })),
    { name: options.page.title, path: `/${encodeURIComponent(options.page.slug)}` },
  ];
}

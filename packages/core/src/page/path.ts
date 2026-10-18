export type PagePathSource = {
  id?: string;
  _id?: { toString(): string };
  slug: string;
  parentId?: { toString(): string } | string | null;
};

export function pageNodeId(page: PagePathSource): string {
  if (page.id) return page.id;
  return page._id?.toString() ?? '';
}

export function pageParentId(page: PagePathSource): string | null {
  const parent = page.parentId;
  if (!parent) return null;
  return typeof parent === 'string' ? parent : parent.toString();
}

/** Public URL for a page, walking parentId from the leaf back to a root page. */
export function pagePublicPath(page: PagePathSource, pages: readonly PagePathSource[]): string {
  const byId = new Map(pages.map((item) => [pageNodeId(item), item]));
  const segments: string[] = [];
  const seen = new Set<string>();
  let current: PagePathSource | undefined = page;

  while (current) {
    const id = pageNodeId(current);
    if (id && seen.has(id)) break;
    if (id) seen.add(id);
    segments.push(current.slug);
    const parentId = pageParentId(current);
    current = parentId ? byId.get(parentId) : undefined;
  }

  return `/${segments.reverse().join('/')}`;
}

export function publicPathsById(pages: readonly PagePathSource[]): Map<string, string> {
  const paths = new Map<string, string>();
  for (const page of pages) {
    const id = pageNodeId(page);
    if (id) paths.set(id, pagePublicPath(page, pages));
  }
  return paths;
}

export function pageParentError(
  pageId: string | null,
  parentId: string | null,
  nodes: readonly { id: string; parentId?: string | null }[],
): string | null {
  if (!parentId) return null;
  if (pageId && parentId === pageId) return 'A page cannot be its own parent';

  const byId = new Map(nodes.map((node) => [node.id, node.parentId ?? null]));
  if (!byId.has(parentId)) return 'Parent page not found';

  const seen = new Set<string>();
  let current: string | null = parentId;
  while (current) {
    if (pageId && current === pageId) return 'Parent page would create a cycle';
    if (seen.has(current)) return 'Parent page would create a cycle';
    seen.add(current);
    current = byId.get(current) ?? null;
  }
  return null;
}

export function collectDescendantIds(
  pages: readonly { id: string; parentId?: string | null }[],
  rootId: string,
): Set<string> {
  const children = new Map<string, string[]>();
  for (const page of pages) {
    if (!page.parentId) continue;
    const list = children.get(page.parentId) ?? [];
    list.push(page.id);
    children.set(page.parentId, list);
  }

  const result = new Set<string>();
  const stack = [...(children.get(rootId) ?? [])];
  while (stack.length > 0) {
    const id = stack.pop();
    if (!id || result.has(id)) continue;
    result.add(id);
    for (const child of children.get(id) ?? []) stack.push(child);
  }
  return result;
}

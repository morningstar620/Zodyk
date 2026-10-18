import { DEFAULT_TENANT_ID, pagePublicPath, type PagePathSource } from '@zodyk/core';
import { getModels } from '@zodyk/database';

export type PagePathNode = PagePathSource & {
  id: string;
  title: string;
  slug: string;
  status: string;
  parentId: string | null;
};

export async function loadPagePathNodes(): Promise<PagePathNode[]> {
  const { Page } = getModels();
  const docs = await Page.find({ tenantId: DEFAULT_TENANT_ID })
    .select('slug title parentId status updatedAt')
    .sort({ updatedAt: -1 })
    .lean();

  return docs.map((doc) => ({
    id: doc._id.toString(),
    slug: doc.slug,
    title: doc.title,
    status: doc.status,
    parentId: doc.parentId ? doc.parentId.toString() : null,
  }));
}

export async function publicPathFor(
  page: { id: string; slug: string; parentId?: { toString(): string } | string | null },
  nodes = loadPagePathNodes(),
): Promise<string> {
  const list = await nodes;
  const parentId = page.parentId
    ? typeof page.parentId === 'string'
      ? page.parentId
      : page.parentId.toString()
    : null;
  return pagePublicPath({ id: page.id, slug: page.slug, parentId }, list);
}

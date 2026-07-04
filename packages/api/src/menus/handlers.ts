import {
  createMenuSchema,
  DEFAULT_TENANT_ID,
  paginationSchema,
  titleToHandle,
  updateMenuSchema,
  type MenuItemInput,
} from '@zodyk/core';
import { AuthError, logAuditEvent, requirePermission, type AuthSession } from '@zodyk/auth';
import { connectDatabase, getModels } from '@zodyk/database';

export interface LinkTargetOption {
  id: string;
  label: string;
  url: string;
  type: 'home' | 'page' | 'meta_archive' | 'meta_entry' | 'http' | 'category';
  resourceId?: string;
  resourceHandle?: string;
  metaType?: string;
  children?: boolean;
  category?: string;
}

export interface LinkTargetCategory {
  id: string;
  label: string;
  icon?: string;
  hasChildren: boolean;
}

interface SerializedMenuItem {
  id?: string;
  label: string;
  url: string;
  type: MenuItemInput['type'];
  resourceId?: string;
  resourceHandle?: string;
  metaType?: string;
  items: SerializedMenuItem[];
}

function serializeMenuItem(item: MenuItemInput & { items?: MenuItemInput[] }): SerializedMenuItem {
  return {
    id: item.id,
    label: item.label,
    url: item.url,
    type: item.type,
    resourceId: item.resourceId,
    resourceHandle: item.resourceHandle,
    metaType: item.metaType,
    items: (item.items ?? []).map(serializeMenuItem),
  };
}

function serializeMenu(item: {
  _id: { toString(): string };
  title: string;
  handle: string;
  items: MenuItemInput[];
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: item._id.toString(),
    title: item.title,
    handle: item.handle,
    items: (item.items ?? []).map(serializeMenuItem),
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

function countMenuItems(items: MenuItemInput[]): number {
  return items.reduce((sum, item) => sum + 1 + countMenuItems(item.items ?? []), 0);
}

function ensureItemIds(items: MenuItemInput[]): MenuItemInput[] {
  return items.map((item) => ({
    ...item,
    id: item.id ?? crypto.randomUUID(),
    items: ensureItemIds(item.items ?? []),
  }));
}

async function invalidateWebsiteCache() {
  const websiteUrl = process.env.WEBSITE_URL ?? 'http://localhost:3001';
  try {
    await fetch(`${websiteUrl}/api/revalidate`, { method: 'POST' });
  } catch {
    /* website may be offline during admin save */
  }
}

function buildMetaEntryUrl(
  def: { slug: string; routing?: { singlePath?: string } },
  handle: string,
): string {
  const singlePath = def.routing?.singlePath ?? `${def.slug}/:handle`;
  return `/${singlePath.replace(':handle', handle)}`;
}

function buildMetaArchiveUrl(def: { slug: string; routing?: { archivePath?: string } }): string {
  const archivePath = def.routing?.archivePath ?? def.slug;
  return `/${archivePath.replace(/^\/+/, '')}`;
}

export async function listMenus(
  session: AuthSession | null,
  params: Record<string, string | string[] | undefined>,
) {
  requirePermission(session, 'menus:read');
  const { page, limit, search } = paginationSchema.parse({
    page: params.page,
    limit: params.limit,
    search: params.search,
  });

  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is required');
  await connectDatabase(uri);
  const { Menu } = getModels();

  const filter: Record<string, unknown> = { tenantId: DEFAULT_TENANT_ID };
  if (search) {
    filter.$or = [
      { title: { $regex: search, $options: 'i' } },
      { handle: { $regex: search, $options: 'i' } },
    ];
  }

  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    Menu.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(limit).lean(),
    Menu.countDocuments(filter),
  ]);

  return {
    data: items.map((item) => ({
      ...serializeMenu(item),
      itemCount: countMenuItems(item.items ?? []),
    })),
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  };
}

export async function getMenu(session: AuthSession | null, id: string) {
  requirePermission(session, 'menus:read');
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is required');
  await connectDatabase(uri);
  const { Menu } = getModels();

  const item = await Menu.findOne({ _id: id, tenantId: DEFAULT_TENANT_ID }).lean();
  if (!item) throw new AuthError('Menu not found', 404);
  return serializeMenu(item);
}

export async function createMenu(session: AuthSession | null, body: unknown, ip?: string) {
  requirePermission(session, 'menus:create');
  const input = createMenuSchema.parse(body);

  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is required');
  await connectDatabase(uri);
  const { Menu } = getModels();

  const handle = input.handle ?? titleToHandle(input.title);
  if (!handle) throw new AuthError('Menu handle is required', 400);

  const existing = await Menu.findOne({ handle, tenantId: DEFAULT_TENANT_ID });
  if (existing) throw new AuthError('Menu handle already exists', 409);

  const items = ensureItemIds(input.items ?? []);
  const item = await Menu.create({
    title: input.title,
    handle,
    items,
    tenantId: DEFAULT_TENANT_ID,
  });

  await logAuditEvent({
    actorId: session!.userId,
    action: 'menu.create',
    resource: 'menus',
    resourceId: item._id.toString(),
    ip,
    metadata: { handle },
  });

  await invalidateWebsiteCache();
  return serializeMenu(item);
}

export async function updateMenu(
  session: AuthSession | null,
  id: string,
  body: unknown,
  ip?: string,
) {
  requirePermission(session, 'menus:update');
  const input = updateMenuSchema.parse(body);

  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is required');
  await connectDatabase(uri);
  const { Menu } = getModels();

  const item = await Menu.findOne({ _id: id, tenantId: DEFAULT_TENANT_ID });
  if (!item) throw new AuthError('Menu not found', 404);

  if (input.handle !== undefined && input.handle !== item.handle) {
    const existing = await Menu.findOne({
      handle: input.handle,
      tenantId: DEFAULT_TENANT_ID,
      _id: { $ne: id },
    });
    if (existing) throw new AuthError('Menu handle already exists', 409);
    item.handle = input.handle;
  }

  if (input.title !== undefined) item.title = input.title;
  if (input.items !== undefined) item.items = ensureItemIds(input.items) as never;

  await item.save();

  await logAuditEvent({
    actorId: session!.userId,
    action: 'menu.update',
    resource: 'menus',
    resourceId: id,
    ip,
    metadata: { handle: item.handle },
  });

  await invalidateWebsiteCache();
  return serializeMenu(item);
}

export async function deleteMenu(session: AuthSession | null, id: string, ip?: string) {
  requirePermission(session, 'menus:delete');
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is required');
  await connectDatabase(uri);
  const { Menu } = getModels();

  const item = await Menu.findOneAndDelete({ _id: id, tenantId: DEFAULT_TENANT_ID });
  if (!item) throw new AuthError('Menu not found', 404);

  await logAuditEvent({
    actorId: session!.userId,
    action: 'menu.delete',
    resource: 'menus',
    resourceId: id,
    ip,
    metadata: { handle: item.handle },
  });

  await invalidateWebsiteCache();
  return { success: true };
}

export async function searchLinkTargets(
  session: AuthSession | null,
  params: Record<string, string | string[] | undefined>,
) {
  requirePermission(session, 'menus:read');

  const q = typeof params.q === 'string' ? params.q.trim() : '';
  const category = typeof params.category === 'string' ? params.category : undefined;
  const metaType = typeof params.metaType === 'string' ? params.metaType : undefined;

  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is required');
  await connectDatabase(uri);
  const { Page, MetaObjectDefinition, MetaObjectEntry } = getModels();

  if (!category && !metaType) {
    const categories: LinkTargetCategory[] = [
      { id: 'home', label: 'Home page', icon: 'home', hasChildren: false },
      { id: 'pages', label: 'Pages', icon: 'file', hasChildren: true },
    ];

    const metaDefs = await MetaObjectDefinition.find({
      tenantId: DEFAULT_TENANT_ID,
      status: 'active',
    })
      .sort({ name: 1 })
      .lean();

    for (const def of metaDefs) {
      categories.push({
        id: `meta:${def.slug}`,
        label: def.name,
        icon: 'shapes',
        hasChildren: true,
      });
    }

    const filteredCategories = q
      ? categories.filter((c) => c.label.toLowerCase().includes(q.toLowerCase()))
      : categories;

    const results: LinkTargetOption[] = [];

    if (!q || 'home'.includes(q.toLowerCase()) || 'home page'.includes(q.toLowerCase())) {
      results.push({
        id: 'home',
        label: 'Home page',
        url: '/',
        type: 'home',
      });
    }

    if (q) {
      const pages = await Page.find({
        tenantId: DEFAULT_TENANT_ID,
        status: 'published',
        $or: [
          { title: { $regex: q, $options: 'i' } },
          { slug: { $regex: q, $options: 'i' } },
        ],
      })
        .limit(20)
        .lean();

      for (const page of pages) {
        results.push({
          id: `page:${page._id.toString()}`,
          label: page.title,
          url: `/${page.slug}`,
          type: 'page',
          resourceId: page._id.toString(),
          resourceHandle: page.handle,
        });
      }

      for (const def of metaDefs) {
        const entries = await MetaObjectEntry.find({
          tenantId: DEFAULT_TENANT_ID,
          metaObjectSlug: def.slug,
          status: 'published',
          deletedAt: { $exists: false },
          $or: [
            { handle: { $regex: q, $options: 'i' } },
            { 'data.title': { $regex: q, $options: 'i' } },
          ],
        })
          .limit(10)
          .lean();

        for (const entry of entries) {
          const title = String(entry.data?.title ?? entry.handle);
          results.push({
            id: `meta_entry:${entry._id.toString()}`,
            label: `${def.name}: ${title}`,
            url: buildMetaEntryUrl(def, entry.handle),
            type: 'meta_entry',
            resourceId: entry._id.toString(),
            resourceHandle: entry.handle,
            metaType: def.slug,
          });
        }
      }
    }

    return { categories: filteredCategories, results };
  }

  if (category === 'pages') {
    const filter: Record<string, unknown> = {
      tenantId: DEFAULT_TENANT_ID,
      status: 'published',
    };
    if (q) {
      filter.$or = [
        { title: { $regex: q, $options: 'i' } },
        { slug: { $regex: q, $options: 'i' } },
      ];
    }

    const pages = await Page.find(filter).sort({ title: 1 }).limit(50).lean();
    const results: LinkTargetOption[] = pages.map((page) => ({
      id: `page:${page._id.toString()}`,
      label: page.title,
      url: `/${page.slug}`,
      type: 'page',
      resourceId: page._id.toString(),
      resourceHandle: page.handle,
    }));

    return { results, count: results.length };
  }

  if (category === 'home') {
    return {
      results: [
        {
          id: 'home',
          label: 'Home page',
          url: '/',
          type: 'home',
        },
      ],
    };
  }

  const slug = metaType ?? category?.replace(/^meta:/, '');
  if (slug) {
    const def = await MetaObjectDefinition.findOne({
      tenantId: DEFAULT_TENANT_ID,
      slug,
      status: 'active',
    }).lean();

    if (!def) {
      return { results: [] };
    }

    const results: LinkTargetOption[] = [];

    if (def.routing?.archiveEnabled !== false) {
      const archiveLabel = `All ${def.name}`;
      if (!q || archiveLabel.toLowerCase().includes(q.toLowerCase())) {
        results.push({
          id: `meta_archive:${def.slug}`,
          label: archiveLabel,
          url: buildMetaArchiveUrl(def),
          type: 'meta_archive',
          metaType: def.slug,
          resourceHandle: def.slug,
        });
      }
    }

    const entryFilter: Record<string, unknown> = {
      tenantId: DEFAULT_TENANT_ID,
      metaObjectSlug: def.slug,
      status: 'published',
      deletedAt: { $exists: false },
    };
    if (q) {
      entryFilter.$or = [
        { handle: { $regex: q, $options: 'i' } },
        { 'data.title': { $regex: q, $options: 'i' } },
      ];
    }

    const entries = await MetaObjectEntry.find(entryFilter).sort({ handle: 1 }).limit(50).lean();
    for (const entry of entries) {
      const title = String(entry.data?.title ?? entry.handle);
      results.push({
        id: `meta_entry:${entry._id.toString()}`,
        label: title,
        url: buildMetaEntryUrl(def, entry.handle),
        type: 'meta_entry',
        resourceId: entry._id.toString(),
        resourceHandle: entry.handle,
        metaType: def.slug,
      });
    }

    return { results, count: results.length, metaType: def.slug, metaName: def.name };
  }

  return { results: [] };
}

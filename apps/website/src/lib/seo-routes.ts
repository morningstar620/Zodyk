import { DEFAULT_TENANT_ID, PUBLIC_META_OBJECT_STATUS } from '@zodyk/core';
import { connectDatabase, getModels } from '@zodyk/database';
import {
  buildRobotsTxt,
  buildSitemapXml,
  collectSitemapEntries,
  readSeoFields,
  sitemapUrlForSite,
} from '@zodyk/seo';
import { NextResponse } from 'next/server';
import { getShopUrl } from './site-url';

export async function sitemapResponse(): Promise<NextResponse> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    return new NextResponse('Sitemap unavailable', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
    });
  }

  await connectDatabase(uri);
  const { Page, MetaObjectDefinition, MetaObjectEntry } = getModels();
  const [pages, definitions, entries] = await Promise.all([
    Page.find({ tenantId: DEFAULT_TENANT_ID, status: 'published' })
      .select('slug updatedAt seo status')
      .lean(),
    MetaObjectDefinition.find({ tenantId: DEFAULT_TENANT_ID, status: PUBLIC_META_OBJECT_STATUS })
      .select('slug routing status')
      .lean(),
    MetaObjectEntry.find({
      tenantId: DEFAULT_TENANT_ID,
      status: 'published',
      deletedAt: { $exists: false },
    })
      .select('handle metaObjectSlug updatedAt status data')
      .lean(),
  ]);

  const definitionsBySlug = new Map(definitions.map((definition) => [definition.slug, definition]));
  const metaEntries = entries.flatMap((entry) => {
    const definition = definitionsBySlug.get(entry.metaObjectSlug);
    if (!definition) return [];
    const seo = readSeoFields(entry.data);
    return [
      {
        handle: entry.handle,
        definitionSlug: definition.slug,
        singlePath: definition.routing?.singlePath,
        updatedAt: entry.updatedAt,
        robots: seo.robots,
        status: entry.status,
      },
    ];
  });

  const xml = buildSitemapXml(
    collectSitemapEntries({
      siteUrl: getShopUrl(),
      pages: pages.map((page) => ({
        slug: page.slug,
        updatedAt: page.updatedAt,
        robots: readSeoFields(page.seo).robots,
        status: page.status,
      })),
      metaEntries,
    }),
  );

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
    },
  });
}

export async function robotsResponse(): Promise<NextResponse> {
  const siteUrl = getShopUrl();
  const sitemapUrl = sitemapUrlForSite(siteUrl);
  let custom: string | undefined;

  const uri = process.env.MONGODB_URI;
  if (uri) {
    await connectDatabase(uri);
    const { PlatformSettings } = getModels();
    const settings = await PlatformSettings.findOne({ tenantId: DEFAULT_TENANT_ID })
      .select('seo.robotsTxt')
      .lean();
    custom = settings?.seo?.robotsTxt;
  }

  const body = buildRobotsTxt(custom, sitemapUrl);
  return new NextResponse(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
    },
  });
}

import { DEFAULT_TENANT_ID } from '@zodyk/core';
import { requireEnv } from './load-env.js';

export async function seedPages(): Promise<void> {
  requireEnv('MONGODB_URI');

  const { connectDatabase, disconnectDatabase, getModels } = await import('@zodyk/database');
  await connectDatabase(process.env.MONGODB_URI!);
  const { Page } = getModels();

  const pages = [
    {
      title: 'About',
      slug: 'about',
      handle: 'about',
      status: 'published' as const,
      templateSuffix: 'about',
      publishedAt: new Date(),
    },
    {
      title: 'Contact',
      slug: 'contact',
      handle: 'contact',
      status: 'published' as const,
      templateSuffix: 'contact',
      publishedAt: new Date(),
    },
  ];

  for (const page of pages) {
    await Page.findOneAndUpdate(
      { slug: page.slug, tenantId: DEFAULT_TENANT_ID },
      { ...page, tenantId: DEFAULT_TENANT_ID, seo: {} },
      { upsert: true, new: true },
    );
    console.log(`Seeded page: ${page.slug}`);
  }

  await disconnectDatabase();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  seedPages().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

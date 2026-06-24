import { DEFAULT_TENANT_ID } from '@zodyk/core';
import { mergeWithDefaultSeo, defaultMetaObjectRouting, defaultMetaObjectTemplates } from '@zodyk/core';
import type { MetaFieldDefinition, MetaFieldGroup } from '@zodyk/core';
import { requireEnv } from './load-env.js';

const CONTENT_GROUP: MetaFieldGroup = { key: 'content', label: 'Content', order: 0 };

function productFields(): MetaFieldDefinition[] {
  return [
    { key: 'name', group: 'content', label: 'Name', type: 'text', required: true, order: 0 },
    { key: 'description', group: 'content', label: 'Description', type: 'rich_text', order: 1 },
    { key: 'price', group: 'content', label: 'Price', type: 'number', required: true, order: 2 },
    { key: 'featured', group: 'content', label: 'Featured', type: 'boolean', order: 3 },
    { key: 'images', group: 'content', label: 'Images', type: 'gallery', order: 4 },
  ];
}

function authorFields(): MetaFieldDefinition[] {
  return [
    { key: 'name', group: 'content', label: 'Name', type: 'text', required: true, order: 0 },
    { key: 'bio', group: 'content', label: 'Bio', type: 'rich_text', order: 1 },
    { key: 'avatar', group: 'content', label: 'Avatar', type: 'image', order: 2 },
    { key: 'website', group: 'content', label: 'Website', type: 'url', order: 3 },
  ];
}

function eventFields(): MetaFieldDefinition[] {
  return [
    { key: 'title', group: 'content', label: 'Title', type: 'text', required: true, order: 0 },
    { key: 'date', group: 'content', label: 'Date', type: 'datetime', required: true, order: 1 },
    { key: 'location', group: 'content', label: 'Location', type: 'text', order: 2 },
    {
      key: 'speakers',
      group: 'content',
      label: 'Speakers',
      type: 'relation',
      order: 3,
      settings: { relation: { targetSlug: 'author', cardinality: 'many' } },
    },
  ];
}

function testimonialFields(): MetaFieldDefinition[] {
  return [
    { key: 'quote', group: 'content', label: 'Quote', type: 'rich_text', required: true, order: 0 },
    { key: 'author_name', group: 'content', label: 'Author Name', type: 'text', required: true, order: 1 },
    { key: 'rating', group: 'content', label: 'Rating', type: 'number', order: 2, validation: { min: 1, max: 5 } },
  ];
}

const TYPE_DEFINITIONS = [
  { name: 'Product', slug: 'product', singularName: 'Product', fields: productFields() },
  { name: 'Author', slug: 'author', singularName: 'Author', fields: authorFields() },
  { name: 'Event', slug: 'event', singularName: 'Event', fields: eventFields() },
  { name: 'Testimonial', slug: 'testimonial', singularName: 'Testimonial', fields: testimonialFields() },
];

export async function seedMetaObjects(): Promise<void> {
  requireEnv('MONGODB_URI');

  const { connectDatabase, disconnectDatabase, getModels } = await import('@zodyk/database');
  await connectDatabase(process.env.MONGODB_URI!);
  const { MetaObjectDefinition, MetaObjectEntry } = getModels();

  for (const def of TYPE_DEFINITIONS) {
    const merged = mergeWithDefaultSeo([CONTENT_GROUP], def.fields);
    await MetaObjectDefinition.findOneAndUpdate(
      { slug: def.slug, tenantId: DEFAULT_TENANT_ID },
      {
        name: def.name,
        slug: def.slug,
        singularName: def.singularName,
        description: `Example ${def.name.toLowerCase()} content type`,
        fieldGroups: merged.fieldGroups,
        fields: merged.fields,
        status: 'active',
        routing: defaultMetaObjectRouting(def.slug),
        templates: defaultMetaObjectTemplates(def.slug),
        display: {
          archiveFields: [],
          archiveSort: '-createdAt',
          archivePageSize: 12,
        },
        tenantId: DEFAULT_TENANT_ID,
      },
      { upsert: true, new: true },
    );
    console.log(`Seeded meta object: ${def.slug}`);
  }

  const author = await MetaObjectEntry.findOneAndUpdate(
    { metaObjectSlug: 'author', tenantId: DEFAULT_TENANT_ID, handle: 'jane-doe' },
    {
      metaObjectSlug: 'author',
      handle: 'jane-doe',
      status: 'published',
      locale: 'en',
      data: {
        name: 'Jane Doe',
        bio: '<p>Writer and speaker.</p>',
        website: 'https://example.com/jane',
      },
      translations: {},
      publishedAt: new Date(),
      tenantId: DEFAULT_TENANT_ID,
    },
    { upsert: true, new: true },
  );

  const author2 = await MetaObjectEntry.findOneAndUpdate(
    { metaObjectSlug: 'author', tenantId: DEFAULT_TENANT_ID, handle: 'john-smith' },
    {
      metaObjectSlug: 'author',
      handle: 'john-smith',
      status: 'published',
      locale: 'en',
      data: {
        name: 'John Smith',
        bio: '<p>Engineer and educator.</p>',
      },
      translations: {},
      publishedAt: new Date(),
      tenantId: DEFAULT_TENANT_ID,
    },
    { upsert: true, new: true },
  );

  await MetaObjectEntry.findOneAndUpdate(
    { metaObjectSlug: 'product', tenantId: DEFAULT_TENANT_ID, handle: 'zodyk-pro' },
    {
      metaObjectSlug: 'product',
      handle: 'zodyk-pro',
      status: 'published',
      locale: 'en',
      data: {
        name: 'Zodyk Pro',
        description: '<p>Enterprise CMS platform.</p>',
        price: 99,
        featured: true,
        images: [],
        seo: {
          metaTitle: 'Zodyk Pro',
          metaDescription: 'Enterprise CMS platform',
          robots: 'index',
          twitterCard: 'summary_large_image',
        },
      },
      translations: {},
      publishedAt: new Date(),
      tenantId: DEFAULT_TENANT_ID,
    },
    { upsert: true, new: true },
  );

  await MetaObjectEntry.findOneAndUpdate(
    { metaObjectSlug: 'event', tenantId: DEFAULT_TENANT_ID, handle: 'zodyk-launch' },
    {
      metaObjectSlug: 'event',
      handle: 'zodyk-launch',
      status: 'published',
      locale: 'en',
      data: {
        title: 'Zodyk Launch',
        date: new Date('2026-09-01T10:00:00.000Z').toISOString(),
        location: 'San Francisco',
        speakers: [author!._id.toString(), author2!._id.toString()],
      },
      translations: {},
      publishedAt: new Date(),
      tenantId: DEFAULT_TENANT_ID,
    },
    { upsert: true, new: true },
  );

  await MetaObjectEntry.findOneAndUpdate(
    { metaObjectSlug: 'testimonial', tenantId: DEFAULT_TENANT_ID, handle: 'acme-corp' },
    {
      metaObjectSlug: 'testimonial',
      handle: 'acme-corp',
      status: 'published',
      locale: 'en',
      data: {
        quote: '<p>Zodyk transformed our content workflow.</p>',
        author_name: 'Acme Corp',
        rating: 5,
      },
      translations: {},
      publishedAt: new Date(),
      tenantId: DEFAULT_TENANT_ID,
    },
    { upsert: true, new: true },
  );

  console.log('Seeded meta object entries');
  await disconnectDatabase();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  seedMetaObjects().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

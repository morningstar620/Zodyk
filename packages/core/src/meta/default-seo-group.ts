import type { MetaFieldDefinition, MetaFieldGroup } from './field-definition';

export const SEO_GROUP_KEY = 'seo';

export function defaultSeoFieldGroup(): MetaFieldGroup {
  return {
    key: SEO_GROUP_KEY,
    label: 'SEO',
    isSystem: true,
    order: 9999,
  };
}

export function defaultSeoFields(): MetaFieldDefinition[] {
  return [
    {
      key: 'seo.metaTitle',
      group: SEO_GROUP_KEY,
      label: 'Meta Title',
      type: 'text',
      localized: true,
      isSystem: true,
      order: 0,
    },
    {
      key: 'seo.metaDescription',
      group: SEO_GROUP_KEY,
      label: 'Meta Description',
      type: 'text',
      localized: true,
      isSystem: true,
      order: 1,
      validation: { maxLength: 320 },
    },
    {
      key: 'seo.canonicalUrl',
      group: SEO_GROUP_KEY,
      label: 'Canonical URL',
      type: 'url',
      isSystem: true,
      order: 2,
    },
    {
      key: 'seo.ogTitle',
      group: SEO_GROUP_KEY,
      label: 'Open Graph Title',
      type: 'text',
      localized: true,
      isSystem: true,
      order: 3,
    },
    {
      key: 'seo.ogDescription',
      group: SEO_GROUP_KEY,
      label: 'Open Graph Description',
      type: 'text',
      localized: true,
      isSystem: true,
      order: 4,
    },
    {
      key: 'seo.ogImage',
      group: SEO_GROUP_KEY,
      label: 'Open Graph Image',
      type: 'image',
      isSystem: true,
      order: 5,
    },
    {
      key: 'seo.twitterCard',
      group: SEO_GROUP_KEY,
      label: 'Twitter Card',
      type: 'text',
      isSystem: true,
      order: 6,
      settings: {
        options: [
          { label: 'Summary', value: 'summary' },
          { label: 'Summary Large Image', value: 'summary_large_image' },
        ],
      },
    },
    {
      key: 'seo.robots',
      group: SEO_GROUP_KEY,
      label: 'Robots',
      type: 'text',
      isSystem: true,
      order: 7,
      settings: {
        options: [
          { label: 'Index', value: 'index' },
          { label: 'No Index', value: 'noindex' },
        ],
      },
    },
    {
      key: 'seo.schemaOrg',
      group: SEO_GROUP_KEY,
      label: 'Schema.org JSON-LD',
      type: 'json',
      isSystem: true,
      order: 8,
    },
  ];
}

export function mergeWithDefaultSeo(
  fieldGroups: MetaFieldGroup[],
  fields: MetaFieldDefinition[],
): { fieldGroups: MetaFieldGroup[]; fields: MetaFieldDefinition[] } {
  const seoGroup = defaultSeoFieldGroup();
  const seoFields = defaultSeoFields();

  const hasSeoGroup = fieldGroups.some((g) => g.key === SEO_GROUP_KEY);
  const mergedGroups = hasSeoGroup ? fieldGroups : [...fieldGroups, seoGroup];

  const userFieldKeys = new Set(fields.map((f) => f.key));
  const mergedFields = [...fields];
  for (const seoField of seoFields) {
    if (!userFieldKeys.has(seoField.key)) {
      mergedFields.push(seoField);
    }
  }

  return { fieldGroups: mergedGroups, fields: mergedFields };
}

export function ensureSeoGroupOnUpdate(
  fieldGroups: MetaFieldGroup[],
  fields: MetaFieldDefinition[],
): { fieldGroups: MetaFieldGroup[]; fields: MetaFieldDefinition[] } {
  return mergeWithDefaultSeo(fieldGroups, fields);
}

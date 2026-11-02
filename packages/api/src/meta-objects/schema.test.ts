import {
  isMetaObjectPubliclyReadable,
  metaFieldDefinitionSchema,
  metaObjectStatusForPublicApi,
  PUBLIC_META_OBJECT_STATUS,
  updateMetaObjectSchema,
  validateEntryData,
} from '@zodyk/core';
import { describe, expect, it } from 'vitest';

describe('meta object public status', () => {
  it('maps a disabled public API to archived and keeps an enabled one active', () => {
    expect(metaObjectStatusForPublicApi(true)).toBe('active');
    expect(metaObjectStatusForPublicApi(false)).toBe('archived');
    expect(isMetaObjectPubliclyReadable('active')).toBe(true);
    expect(isMetaObjectPubliclyReadable('archived')).toBe(false);
    expect(isMetaObjectPubliclyReadable('draft')).toBe(false);
    expect(PUBLIC_META_OBJECT_STATUS).toBe('active');
  });

  it('accepts archived on save and rejects the invalid draft status', () => {
    expect(updateMetaObjectSchema.safeParse({ status: 'archived' }).success).toBe(true);
    expect(updateMetaObjectSchema.safeParse({ status: 'active' }).success).toBe(true);
    expect(updateMetaObjectSchema.safeParse({ status: 'draft' }).success).toBe(false);
  });

  it('lets template keys be cleared with null', () => {
    const parsed = updateMetaObjectSchema.parse({
      templates: { templateKey: 'blog', archiveTemplateKey: null, singleTemplateKey: 'article' },
    });
    expect(parsed.templates).toEqual({
      templateKey: 'blog',
      archiveTemplateKey: null,
      singleTemplateKey: 'article',
    });
  });
});

describe('meta field authoring schema', () => {
  it('stores repeater child fields that the entry form validates', () => {
    const field = metaFieldDefinitionSchema.parse({
      key: 'slides',
      group: 'content',
      label: 'Slides',
      type: 'repeater',
      settings: {
        repeater: {
          fields: [{ key: 'title', group: 'content', label: 'Title', type: 'text', order: 0 }],
        },
      },
      order: 0,
    });

    expect(field.settings?.repeater?.fields).toHaveLength(1);
    const valid = validateEntryData([field], { slides: [{ title: 'Hello' }] });
    expect(valid.success).toBe(true);
    if (valid.success) expect(valid.data.slides).toEqual([{ title: 'Hello' }]);
  });

  it('accepts select options, validation, conditionals, and entity references', () => {
    const parsed = metaFieldDefinitionSchema.parse({
      key: 'author',
      group: 'content',
      label: 'Author',
      type: 'entity_reference',
      validation: { required: true },
      conditional: [
        {
          when: { field: 'title', operator: 'not_empty' },
          action: 'show',
          targets: ['author'],
        },
      ],
      settings: {
        options: [{ label: 'Guest', value: 'guest' }],
        entityReference: {
          targetCategory: 'meta_object',
          targetSlug: 'people',
          cardinality: 'one',
        },
      },
      order: 1,
    });

    expect(parsed.settings?.entityReference?.targetSlug).toBe('people');
    expect(parsed.settings?.options?.[0]?.value).toBe('guest');
    expect(parsed.conditional?.[0]?.action).toBe('show');
  });
});

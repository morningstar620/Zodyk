import { describe, expect, it } from 'vitest';
import {
  findPageByPath,
  metaTemplateKeyFor,
  resolveRoute,
  type RouteMetaDefinition,
  type RoutePage,
} from './router';

function page(id: string, slug: string, parentId?: string, status = 'published'): RoutePage {
  return {
    _id: { toString: () => id },
    title: slug,
    slug,
    handle: slug,
    status,
    parentId,
  };
}

const pages = [page('about', 'about'), page('team', 'team', 'about'), page('other-team', 'crew')];

const options = {
  pages,
  metaDefinitions: [],
  findMetaEntries: async () => ({ items: [], total: 0 }),
  findMetaEntryByHandle: async () => null,
};

describe('findPageByPath', () => {
  it('matches a root page', () => {
    expect(findPageByPath(pages, ['about'])?._id.toString()).toBe('about');
  });

  it('matches a child only under its parent', async () => {
    const match = await resolveRoute('/about/team', options);
    expect(match.view).toBe('page');
    expect(match.page?._id.toString()).toBe('team');
  });

  it('does not match a nested URL from the last slug alone', async () => {
    const match = await resolveRoute('/crew/team', options);
    expect(match.view).toBe('not_found');
    expect(findPageByPath(pages, ['other', 'team'])).toBeUndefined();
  });

  it('does not serve a child at the root slug', () => {
    expect(findPageByPath(pages, ['team'])).toBeUndefined();
  });

  it('ignores unpublished pages in the chain', () => {
    const draftParent = [page('about', 'about', undefined, 'draft'), page('team', 'team', 'about')];
    expect(findPageByPath(draftParent, ['about', 'team'])).toBeUndefined();
  });
});

const journal: RouteMetaDefinition = {
  slug: 'post',
  name: 'Post',
  routing: {
    archiveEnabled: true,
    archivePath: 'journal',
    singlePath: 'journal/:handle',
    handleField: 'handle',
  },
  templates: {
    templateKey: 'post',
    archiveTemplateKey: 'journal',
    singleTemplateKey: 'article',
  },
};

describe('meta object routes', () => {
  it('uses the archive path and archive template key', async () => {
    const match = await resolveRoute('/journal', {
      ...options,
      metaDefinitions: [journal],
      findMetaEntries: async () => ({ items: [], total: 0 }),
    });
    expect(match.view).toBe('meta_archive');
    expect(match.metaDefinition?.slug).toBe('post');
    expect(match.metaTemplateKey).toBe('journal');
    expect(metaTemplateKeyFor(journal, 'meta_archive')).toBe('journal');
  });

  it('uses the single path and single template key', async () => {
    const match = await resolveRoute('/journal/hello', {
      ...options,
      metaDefinitions: [journal],
      findMetaEntryByHandle: async (slug, handle) => {
        expect(slug).toBe('post');
        return {
          _id: { toString: () => 'entry-1' },
          handle,
          status: 'published',
          locale: 'en',
          data: { title: 'Hello' },
        };
      },
    });
    expect(match.view).toBe('meta_single');
    expect(match.metaEntry?.handle).toBe('hello');
    expect(match.metaTemplateKey).toBe('article');
  });

  it('does not serve the archive when archive routing is disabled', async () => {
    const match = await resolveRoute('/journal', {
      ...options,
      metaDefinitions: [
        {
          ...journal,
          routing: { ...journal.routing!, archiveEnabled: false },
        },
      ],
    });
    expect(match.view).toBe('not_found');
  });

  it('does not keep the slug path after a custom archive path is set', async () => {
    const match = await resolveRoute('/post', {
      ...options,
      metaDefinitions: [journal],
    });
    expect(match.view).toBe('not_found');
  });
});

import { describe, expect, it } from 'vitest';
import { findPageByPath, resolveRoute, type RoutePage } from './router';

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

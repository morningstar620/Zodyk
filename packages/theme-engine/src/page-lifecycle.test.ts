import { describe, expect, it } from 'vitest';
import {
  collectDescendantIds,
  diffLines,
  diffRecords,
  isDueScheduled,
  normalizePublication,
  pageParentError,
  pagePublicPath,
  resolvePagePublication,
} from '@zodyk/core';

const now = new Date('2026-10-18T12:00:00.000Z');

describe('resolvePagePublication', () => {
  it('keeps a hidden page as a draft and clears the schedule', () => {
    expect(resolvePagePublication({ visible: false, publishedAt: now.toISOString(), now })).toEqual(
      {
        status: 'draft',
        scheduledAt: null,
      },
    );
  });

  it('keeps an archived hidden page archived', () => {
    expect(resolvePagePublication({ visible: false, archived: true, now }).status).toBe('archived');
  });

  it('publishes a past date as publishedAt', () => {
    const publishedAt = '2026-01-02T03:04:05.000Z';
    expect(resolvePagePublication({ visible: true, publishedAt, now })).toEqual({
      status: 'published',
      publishedAt,
      scheduledAt: null,
    });
  });

  it('schedules a future date', () => {
    const scheduledAt = '2026-12-01T00:00:00.000Z';
    expect(resolvePagePublication({ visible: true, publishedAt: scheduledAt, now })).toEqual({
      status: 'scheduled',
      publishedAt: null,
      scheduledAt,
    });
  });
});

describe('normalizePublication', () => {
  it('promotes a schedule whose time has passed', () => {
    expect(
      normalizePublication({
        status: 'scheduled',
        scheduledAt: '2026-10-18T11:00:00.000Z',
        now,
      }),
    ).toEqual({
      status: 'published',
      publishedAt: '2026-10-18T11:00:00.000Z',
      scheduledAt: null,
    });
  });

  it('leaves a future schedule in place', () => {
    expect(
      normalizePublication({
        status: 'scheduled',
        scheduledAt: '2026-10-19T00:00:00.000Z',
        now,
      }).status,
    ).toBe('scheduled');
  });

  it('stamps publishedAt when publishing without a date', () => {
    expect(normalizePublication({ status: 'published', now }).publishedAt).toBe(now.toISOString());
  });
});

describe('isDueScheduled', () => {
  it('is true only for scheduled rows at or before now', () => {
    expect(isDueScheduled('scheduled', '2026-10-18T12:00:00.000Z', now)).toBe(true);
    expect(isDueScheduled('scheduled', '2026-10-18T12:00:01.000Z', now)).toBe(false);
    expect(isDueScheduled('published', '2026-10-18T11:00:00.000Z', now)).toBe(false);
    expect(isDueScheduled('scheduled', null, now)).toBe(false);
  });
});

describe('page hierarchy helpers', () => {
  const pages = [
    { id: 'about', slug: 'about', parentId: null },
    { id: 'team', slug: 'team', parentId: 'about' },
    { id: 'other', slug: 'other', parentId: null },
  ];

  it('builds the parent chain into the public path', () => {
    expect(pagePublicPath(pages[1]!, pages)).toBe('/about/team');
    expect(pagePublicPath(pages[0]!, pages)).toBe('/about');
  });

  it('rejects a parent that would cycle or is missing', () => {
    expect(pageParentError('team', 'about', pages)).toBeNull();
    expect(pageParentError('about', 'team', pages)).toBe('Parent page would create a cycle');
    expect(pageParentError('about', 'about', pages)).toBe('A page cannot be its own parent');
    expect(pageParentError('about', 'missing', pages)).toBe('Parent page not found');
  });

  it('collects descendants so a page cannot be parented under its child', () => {
    expect([...collectDescendantIds(pages, 'about')]).toEqual(['team']);
    expect(collectDescendantIds(pages, 'team').size).toBe(0);
  });

  it('stops walking a parent cycle', () => {
    const cycled = [
      { id: 'a', slug: 'a', parentId: 'b' },
      { id: 'b', slug: 'b', parentId: 'a' },
    ];
    expect(pagePublicPath(cycled[0]!, cycled).split('/').filter(Boolean).length).toBeLessThan(5);
  });
});

describe('revision diff', () => {
  it('lists changed fields and ignores identical ones', () => {
    const changes = diffRecords(
      { title: 'About', status: 'draft', seo: { metaTitle: 'A' } },
      { title: 'About us', status: 'draft', seo: { metaTitle: 'A' } },
      ['title', 'status', 'seo'],
    );
    expect(changes).toEqual([{ field: 'title', before: 'About', after: 'About us' }]);
  });

  it('diffs body lines', () => {
    const diff = diffLines('hello\nworld', 'hello\nthere');
    expect(diff).toContainEqual({ type: 'context', text: 'hello' });
    expect(diff).toContainEqual({ type: 'removed', text: 'world' });
    expect(diff).toContainEqual({ type: 'added', text: 'there' });
  });
});

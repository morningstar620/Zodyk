import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_ROLE_PERMISSIONS, ROLE_SLUGS, type RoleSlug } from '@zodyk/core';
import type { AuthSession } from '@zodyk/auth';

interface Id {
  toString(): string;
}

interface PageDoc {
  _id: Id;
  title: string;
  slug: string;
  handle: string;
  parentId?: string;
  templateSuffix?: string;
  body?: string;
  seo: Record<string, unknown>;
  status: string;
  publishedAt?: Date;
  scheduledAt?: Date | undefined;
  createdBy?: string;
  updatedBy?: string;
  tenantId: string;
  createdAt: Date;
  updatedAt: Date;
  save: () => Promise<PageDoc>;
}

interface EntryDoc {
  _id: Id;
  metaObjectSlug: string;
  handle: string;
  templateSuffix?: string;
  status: string;
  locale: string;
  data: Record<string, unknown>;
  translations: Record<string, Record<string, unknown>>;
  publishedAt?: Date;
  scheduledAt?: Date | undefined;
  createdBy?: string;
  updatedBy?: string;
  tenantId: string;
  save: () => Promise<EntryDoc>;
}

interface AuditDoc {
  _id: Id;
  actorId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  ip?: string;
  tenantId: string;
  createdAt: Date;
}

const harness = vi.hoisted(() => {
  const pages: PageDoc[] = [];
  const entries: EntryDoc[] = [];
  const auditLogs: AuditDoc[] = [];
  let seq = 0;

  function makeId(prefix: string): Id {
    seq += 1;
    const value = `${prefix}-${seq}`;
    return { toString: () => value };
  }

  function matches(doc: object, filter: Record<string, unknown>): boolean {
    const record = doc as Record<string, unknown>;
    for (const [key, expected] of Object.entries(filter)) {
      if (expected && typeof expected === 'object') {
        const ops = expected as Record<string, unknown>;
        if ('$exists' in ops) {
          const exists = record[key] !== undefined;
          if (Boolean(ops.$exists) !== exists) return false;
        }
        if ('$ne' in ops && String(record[key]) === String(ops.$ne)) return false;
        continue;
      }
      const actual = record[key];
      const actualValue =
        actual && typeof actual === 'object' && 'toString' in actual ? String(actual) : actual;
      if (actualValue !== expected) return false;
    }
    return true;
  }

  function query<T>(rows: T[]) {
    const api = {
      sort: () => api,
      skip: () => api,
      limit: () => api,
      lean: async () => rows,
    };
    return api;
  }

  function foundQuery<T>(found: T | null) {
    const query = Promise.resolve(found) as Promise<T | null> & {
      lean: () => Promise<T | null>;
    };
    query.lean = async () => found;
    return query;
  }

  const models = {
    Page: {
      findOne: (filter: Record<string, unknown>) =>
        foundQuery(pages.find((page) => matches(page, filter)) ?? null),
      create: async (doc: Partial<PageDoc>) => {
        const page = {
          title: '',
          slug: '',
          handle: '',
          seo: {},
          status: 'draft',
          tenantId: 'default',
          createdAt: new Date(),
          updatedAt: new Date(),
          ...doc,
          _id: makeId('page'),
        } as PageDoc;
        page.save = async () => page;
        pages.push(page);
        return page;
      },
      findOneAndDelete: async (filter: Record<string, unknown>) => {
        const index = pages.findIndex((page) => matches(page, filter));
        if (index < 0) return null;
        const [removed] = pages.splice(index, 1);
        return removed ?? null;
      },
    },
    MetaObjectDefinition: {
      findOne: async () => ({
        fields: [{ key: 'title', type: 'text', label: 'Title', group: 'general' }],
        slug: 'article',
        status: 'active',
      }),
    },
    MetaObjectEntry: {
      findOne: (filter: Record<string, unknown>) =>
        foundQuery(entries.find((entry) => matches(entry, filter)) ?? null),
      create: async (doc: Partial<EntryDoc>) => {
        const entry = {
          metaObjectSlug: 'article',
          handle: 'entry',
          status: 'draft',
          locale: 'en',
          data: {},
          translations: {},
          tenantId: 'default',
          ...doc,
          _id: makeId('entry'),
        } as EntryDoc;
        entry.save = async () => entry;
        entries.push(entry);
        return entry;
      },
    },
    AuditLog: {
      create: async (doc: Omit<AuditDoc, '_id' | 'createdAt'>) => {
        const row: AuditDoc = { ...doc, _id: makeId('audit'), createdAt: new Date() };
        auditLogs.push(row);
        return row;
      },
      find: () => query([...auditLogs].reverse()),
      countDocuments: async () => auditLogs.length,
    },
    User: {
      find: () => ({ lean: async () => [] }),
    },
  };

  const themeFns = {
    activateTheme: vi.fn(async () => undefined),
    publishTheme: vi.fn(async () => undefined),
    upsertThemeFile: vi.fn(async () => ({ isLive: false })),
    deleteThemeFile: vi.fn(async () => ({ isLive: false })),
    getThemeFile: vi.fn(async () => null),
    installThemeFromDirectory: vi.fn(async () => ({ themeId: 'theme-installed' })),
    installThemeFromZip: vi.fn(async () => ({ themeId: 'theme-uploaded' })),
    updateThemeSettingsForTheme: vi.fn(async () => ({
      settings: { color: '#fff' },
      isLive: false,
    })),
    loadActiveTheme: vi.fn(async () => ({ id: 'theme-live', settings: {}, files: {} })),
  };

  return {
    pages,
    entries,
    auditLogs,
    themeFns,
    reset() {
      pages.length = 0;
      entries.length = 0;
      auditLogs.length = 0;
      seq = 0;
      for (const fn of Object.values(themeFns)) fn.mockClear();
    },
    databaseModule: {
      connectDatabase: async () => ({}),
      getModels: () => models,
      getSystemEntityRepository: () => ({}),
      mongoose: {},
    },
    themeEngineModule: new Proxy(themeFns, {
      get(target, prop) {
        if (prop === '__esModule') return true;
        if (prop === 'then') return undefined;
        if (typeof prop === 'string' && prop in target) {
          return target[prop as keyof typeof target];
        }
        return vi.fn(async () => ({}));
      },
    }),
  };
});

vi.mock('@zodyk/database', () => harness.databaseModule);
vi.mock('@zodyk/theme-engine', () => harness.themeEngineModule);
vi.mock('@zodyk/auth', async () => {
  const check = await import('../../auth/src/rbac/check');
  const middleware = await import('../../auth/src/rbac/middleware');
  const audit = await import('../../auth/src/security/audit');
  return {
    hasPermission: check.hasPermission,
    hasAnyPermission: check.hasAnyPermission,
    hasAllPermissions: check.hasAllPermissions,
    requireAuth: middleware.requireAuth,
    requirePermission: middleware.requirePermission,
    AuthError: middleware.AuthError,
    logAuditEvent: audit.logAuditEvent,
  };
});
vi.mock('./themes/language-workspace', () => ({
  buildThemeLanguageWorkspace: vi.fn(),
  buildThemeLanguageWorkspaceMetadata: vi.fn(),
  buildThemeLanguageHealth: vi.fn(),
  buildWorkspaceTimingsHeader: vi.fn(() => ''),
  getThemeLanguageWorkspaceFiles: vi.fn(),
  invalidateWorkspaceMetadataCache: vi.fn(),
  warmWorkspaceMetadataCache: vi.fn(),
}));

import { listAuditLogs } from './audit-logs/handlers';
import {
  createMetaEntry,
  getMetaEntry,
  publishMetaEntry,
  updateMetaEntry,
} from './meta-entries/handlers';
import { createPage, deletePage, getPage, publishPage, updatePage } from './pages/handlers';
import {
  activateThemeHandler,
  createThemeFileHandler,
  deleteThemeFileHandler,
  installDefaultThemeHandler,
  publishThemeHandler,
  putThemeFileHandler,
  updateThemeSettings,
  updateThemeSettingsById,
  uploadThemeHandler,
} from './themes/handlers';

const AUTHOR_ID = '64b0000000000000000000a1';
const EDITOR_ID = '64b0000000000000000000e1';
const ADMIN_ID = '64b0000000000000000000d1';

function sessionFor(role: RoleSlug, userId: string): AuthSession {
  return {
    userId,
    email: `${role}@example.com`,
    name: role,
    tenantId: 'default',
    roleIds: [],
    permissions: DEFAULT_ROLE_PERMISSIONS[role],
  };
}

const author = sessionFor(ROLE_SLUGS.AUTHOR, AUTHOR_ID);
const editor = sessionFor(ROLE_SLUGS.EDITOR, EDITOR_ID);
const admin = sessionFor(ROLE_SLUGS.ADMIN, ADMIN_ID);

beforeEach(() => {
  process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/zodyk-test';
  harness.reset();
});

describe('meta entry publish permission', () => {
  it('rejects an author publishing or scheduling through the generic update', async () => {
    const created = await createMetaEntry(author, 'article', { data: { title: 'Hello' } });
    expect(created.status).toBe('draft');

    await expect(
      updateMetaEntry(author, 'article', created.id, { status: 'published' }),
    ).rejects.toMatchObject({ status: 403 });
    await expect(
      updateMetaEntry(author, 'article', created.id, { status: 'scheduled' }),
    ).rejects.toMatchObject({ status: 403 });

    const after = await getMetaEntry(editor, 'article', created.id);
    expect(after.status).toBe('draft');
  });

  it('still lets an author update entry data', async () => {
    const created = await createMetaEntry(author, 'article', { data: { title: 'Hello' } });
    const updated = await updateMetaEntry(author, 'article', created.id, {
      data: { title: 'Hello revised' },
    });
    expect(updated.status).toBe('draft');
    expect(updated.data).toMatchObject({ title: 'Hello revised' });
  });

  it('rejects an author creating an already published or scheduled entry', async () => {
    await expect(
      createMetaEntry(author, 'article', { data: { title: 'Live' }, status: 'published' }),
    ).rejects.toMatchObject({ status: 403 });
    await expect(
      createMetaEntry(author, 'article', { data: { title: 'Later' }, status: 'scheduled' }),
    ).rejects.toMatchObject({ status: 403 });
    expect(harness.entries).toHaveLength(0);
  });

  it('lets an editor publish through the dedicated endpoint and through update', async () => {
    const created = await createMetaEntry(author, 'article', { data: { title: 'Hello' } });
    const published = await publishMetaEntry(editor, 'article', created.id, {});
    expect(published.status).toBe('published');
    expect(published.publishedAt).toBeInstanceOf(Date);

    const second = await createMetaEntry(author, 'article', { data: { title: 'Second' } });
    const scheduled = await updateMetaEntry(editor, 'article', second.id, { status: 'scheduled' });
    expect(scheduled.status).toBe('scheduled');
    const viaUpdate = await updateMetaEntry(editor, 'article', created.id, {
      status: 'published',
      data: { title: 'Hello live' },
    });
    expect(viaUpdate.status).toBe('published');
  });
});

describe('page ownership and publish permission', () => {
  it('lets an author create and update only their own draft pages', async () => {
    const created = await createPage(author, { title: 'Notes', slug: 'notes', body: 'hello' });
    expect(created.status).toBe('draft');
    expect(created.createdBy).toBe(AUTHOR_ID);

    const updated = await updatePage(author, created.id, { title: 'Notes revised', body: 'world' });
    expect(updated.title).toBe('Notes revised');
    expect(updated.status).toBe('draft');
    expect(updated.createdBy).toBe(AUTHOR_ID);
  });

  it('rejects an author creating a published or scheduled page', async () => {
    await expect(
      createPage(author, { title: 'Live', slug: 'live', status: 'published' }),
    ).rejects.toMatchObject({ status: 403 });
    await expect(
      createPage(author, { title: 'Later', slug: 'later', status: 'scheduled' }),
    ).rejects.toMatchObject({ status: 403 });
    expect(harness.pages).toHaveLength(0);
  });

  it('rejects an author publishing their own draft or editing someone else', async () => {
    const own = await createPage(author, { title: 'Notes', slug: 'notes' });
    const theirs = await createPage(editor, {
      title: 'Editor page',
      slug: 'editor-page',
      status: 'draft',
    });

    await expect(
      updatePage(author, own.id, { title: 'Notes', status: 'published' }),
    ).rejects.toMatchObject({ status: 403 });
    await expect(updatePage(author, theirs.id, { title: 'Hijacked' })).rejects.toMatchObject({
      status: 403,
    });
    await expect(publishPage(author, own.id, {})).rejects.toMatchObject({ status: 403 });
    await expect(deletePage(author, own.id)).rejects.toMatchObject({ status: 403 });

    const unchanged = await getPage(editor, own.id);
    expect(unchanged.title).toBe('Notes');
    expect(unchanged.status).toBe('draft');
    const editorPage = await getPage(editor, theirs.id);
    expect(editorPage.title).toBe('Editor page');
  });

  it('rejects an author editing a page they do not own, including legacy pages', async () => {
    const legacy = await createPage(editor, { title: 'Legacy', slug: 'legacy', status: 'draft' });
    const stored = harness.pages.find((page) => page._id.toString() === legacy.id);
    if (!stored) throw new Error('expected stored page');
    stored.createdBy = undefined;

    await expect(updatePage(author, legacy.id, { title: 'Taken' })).rejects.toMatchObject({
      status: 403,
    });
    const updated = await updatePage(editor, legacy.id, { title: 'Still ours' });
    expect(updated.title).toBe('Still ours');
  });

  it('stops an author from editing their page after it is published', async () => {
    const own = await createPage(author, { title: 'Notes', slug: 'notes' });
    const published = await publishPage(editor, own.id, {});
    expect(published.status).toBe('published');

    await expect(updatePage(author, own.id, { title: 'After publish' })).rejects.toMatchObject({
      status: 403,
    });
  });

  it('lets an editor create a published page and update or delete any page', async () => {
    const published = await createPage(editor, {
      title: 'Live',
      slug: 'live',
      status: 'published',
    });
    expect(published.status).toBe('published');
    expect(published.createdBy).toBe(EDITOR_ID);

    const own = await createPage(author, { title: 'Notes', slug: 'notes' });
    const edited = await updatePage(editor, own.id, { title: 'Edited by editor', status: 'draft' });
    expect(edited.title).toBe('Edited by editor');

    await expect(deletePage(editor, own.id)).resolves.toEqual({ success: true });
    await expect(getPage(editor, own.id)).rejects.toMatchObject({ status: 404 });
  });
});

describe('theme mutation audit logs', () => {
  it('records activate and file saves on GET /api/v1/audit-logs', async () => {
    await activateThemeHandler(admin, { themeId: 'theme-1' }, '10.0.0.8');
    await putThemeFileHandler(
      admin,
      'theme-1',
      { path: 'sections/hero.liquid', content: '<div>hero</div>' },
      '10.0.0.8',
    );

    const listed = await listAuditLogs(admin, {});
    expect(listed.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          action: 'theme.activate',
          resource: 'themes',
          resourceId: 'theme-1',
          ip: '10.0.0.8',
        }),
        expect.objectContaining({
          action: 'theme.file.update',
          resource: 'themes',
          resourceId: 'theme-1',
          metadata: { path: 'sections/hero.liquid' },
          ip: '10.0.0.8',
        }),
      ]),
    );
  });

  it('records install, publish, file create and delete, and settings changes', async () => {
    await installDefaultThemeHandler(admin, '/tmp/starter', '10.0.0.8');
    const file = new File([new Uint8Array([1, 2, 3])], 'starter.zip', {
      type: 'application/zip',
    });
    const form = new FormData();
    form.set('file', file);
    form.set('name', 'Starter');
    form.set('slug', 'starter');
    await uploadThemeHandler(admin, form, '10.0.0.8');
    await publishThemeHandler(admin, { themeId: 'theme-1' }, '10.0.0.8');
    await createThemeFileHandler(
      admin,
      'theme-1',
      { path: 'snippets/card.liquid', content: '<div></div>' },
      '10.0.0.8',
    );
    await deleteThemeFileHandler(admin, 'theme-1', 'snippets/card.liquid', '10.0.0.8');
    await updateThemeSettings(admin, { color: '#111' }, '10.0.0.8');
    await updateThemeSettingsById(admin, 'theme-2', { color: '#222' }, '10.0.0.8');

    const listed = await listAuditLogs(admin, {});
    const actions = listed.data.map((row) => `${row.action}:${row.resourceId ?? ''}`);
    expect(actions).toEqual(
      expect.arrayContaining([
        'theme.install:theme-installed',
        'theme.install:theme-uploaded',
        'theme.publish:theme-1',
        'theme.file.create:theme-1',
        'theme.file.delete:theme-1',
        'theme.settings.update:theme-live',
        'theme.settings.update:theme-2',
      ]),
    );
    expect(listed.data.every((row) => row.resource === 'themes')).toBe(true);
  });
});

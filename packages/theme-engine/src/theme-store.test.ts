import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  themeFindOne: vi.fn(),
  themeFileFindOne: vi.fn(),
  readFile: vi.fn(),
  getThemeStorageKind: vi.fn(() => 'local'),
}));

vi.mock('@zodyk/database', () => ({
  connectDatabase: vi.fn(async () => {}),
  getModels: () => ({
    Theme: { findOne: mocks.themeFindOne },
    ThemeFile: { findOne: mocks.themeFileFindOne },
  }),
  resolveThemeFileStorageKey: vi.fn(),
}));

vi.mock('./storage/create-theme-storage', () => ({
  getThemeStorage: () => ({ readFile: mocks.readFile }),
  getThemeStorageKind: mocks.getThemeStorageKind,
}));

import { getThemeAssetFile, hasPreviewTheme, invalidateThemeCache } from './theme-store';

function query<T>(value: T) {
  const lean = async () => value;
  return { select: () => ({ lean }), lean };
}

describe('hasPreviewTheme', () => {
  it('requires both the preview theme id and token', () => {
    expect(hasPreviewTheme({ previewThemeId: 'theme-1', previewToken: 'token-1' })).toBe(true);
    expect(hasPreviewTheme({ previewThemeId: 'theme-1' })).toBe(false);
    expect(hasPreviewTheme({ previewToken: 'token-1' })).toBe(false);
    expect(hasPreviewTheme({})).toBe(false);
  });
});

describe('getThemeAssetFile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.MONGODB_URI = 'mongodb://localhost/test';
    mocks.getThemeStorageKind.mockReturnValue('local');
    mocks.readFile.mockResolvedValue('body');
    invalidateThemeCache('theme-1');
  });

  it('propagates isPreview through the preview lookup and storage read', async () => {
    mocks.themeFindOne
      .mockReturnValueOnce(query({ _id: { toString: () => 'theme-1' } }))
      .mockReturnValueOnce(query({ _id: 'theme-1' }));
    mocks.themeFileFindOne.mockReturnValue(query(null));

    const asset = await getThemeAssetFile('theme.js', {
      previewThemeId: 'theme-1',
      previewToken: 'token-1',
    });

    expect(asset).toMatchObject({
      path: 'assets/theme.js',
      content: 'body',
      isPreview: true,
    });
  });

  it('keeps isPreview false for a live theme read', async () => {
    mocks.themeFindOne
      .mockReturnValueOnce(query({ _id: { toString: () => 'theme-1' } }))
      .mockReturnValueOnce(query({ _id: 'theme-1' }));
    mocks.themeFileFindOne.mockReturnValue(query(null));

    const asset = await getThemeAssetFile('theme.js');

    expect(asset).toMatchObject({
      path: 'assets/theme.js',
      content: 'body',
      isPreview: false,
    });
  });
});

import { describe, expect, it } from 'vitest';
import { hasPreviewTheme } from './theme-store';

describe('hasPreviewTheme', () => {
  it('requires both the preview theme id and token', () => {
    expect(hasPreviewTheme({ previewThemeId: 'theme-1', previewToken: 'token-1' })).toBe(true);
    expect(hasPreviewTheme({ previewThemeId: 'theme-1' })).toBe(false);
    expect(hasPreviewTheme({ previewToken: 'token-1' })).toBe(false);
    expect(hasPreviewTheme({})).toBe(false);
  });
});

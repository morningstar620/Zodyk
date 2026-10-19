import {
  defaultLocalizationSettings,
  localizationSettingsSchema,
  normalizeLocalizationSettings,
} from '@zodyk/core';
import { describe, expect, it } from 'vitest';

describe('localization settings', () => {
  it('defaults to en, fr, es, and de', () => {
    expect(defaultLocalizationSettings()).toEqual({
      defaultLocale: 'en',
      locales: ['en', 'fr', 'es', 'de'],
    });
    expect(normalizeLocalizationSettings(undefined)).toEqual(defaultLocalizationSettings());
  });

  it('requires the default locale to be in the list', () => {
    expect(
      localizationSettingsSchema.safeParse({ defaultLocale: 'en', locales: ['fr'] }).success,
    ).toBe(false);
    expect(
      localizationSettingsSchema.safeParse({ defaultLocale: 'fr', locales: ['en', 'fr'] }).success,
    ).toBe(true);
  });
});

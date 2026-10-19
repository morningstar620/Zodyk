import { z } from 'zod';

const localeCodeSchema = z
  .string()
  .trim()
  .min(2)
  .max(15)
  .regex(/^[a-z]{2}(?:-[A-Za-z0-9]{2,8})?$/, 'Use a locale code like en or en-US');

export const DEFAULT_CONTENT_LOCALES = ['en', 'fr', 'es', 'de'] as const;

export const localizationSettingsSchema = z
  .object({
    defaultLocale: localeCodeSchema,
    locales: z.array(localeCodeSchema).min(1).max(20),
  })
  .superRefine((value, ctx) => {
    if (new Set(value.locales).size !== value.locales.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Locales must be unique',
        path: ['locales'],
      });
    }
    if (!value.locales.includes(value.defaultLocale)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Default locale must be included in locales',
        path: ['defaultLocale'],
      });
    }
  });

export type LocalizationSettings = z.infer<typeof localizationSettingsSchema>;

export function defaultLocalizationSettings(): LocalizationSettings {
  return {
    defaultLocale: 'en',
    locales: [...DEFAULT_CONTENT_LOCALES],
  };
}

export function normalizeLocalizationSettings(
  value:
    | {
        defaultLocale?: string | null;
        locales?: string[] | null;
      }
    | null
    | undefined,
): LocalizationSettings {
  const fallback = defaultLocalizationSettings();
  const parsed = localizationSettingsSchema.safeParse({
    defaultLocale: value?.defaultLocale || fallback.defaultLocale,
    locales: value?.locales?.length ? value.locales : fallback.locales,
  });
  return parsed.success ? parsed.data : fallback;
}

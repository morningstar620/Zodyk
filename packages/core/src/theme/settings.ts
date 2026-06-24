import { z } from 'zod';
import { sectionSettingSchema } from './section-schema';

export const themeSettingsGroupSchema = z.object({
  name: z.string(),
  settings: z.array(sectionSettingSchema),
});

export const themeSettingsSchemaSchema = z.array(themeSettingsGroupSchema);

export const themeSettingsValuesSchema = z.record(z.unknown());

export type ThemeSettingsGroup = z.infer<typeof themeSettingsGroupSchema>;
export type ThemeSettingsSchema = z.infer<typeof themeSettingsSchemaSchema>;
export type ThemeSettingsValues = z.infer<typeof themeSettingsValuesSchema>;

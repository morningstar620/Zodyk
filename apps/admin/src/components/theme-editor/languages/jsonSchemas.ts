import type { Monaco } from '@monaco-editor/react';
import type { ThemeWorkspaceSnapshot } from '@zodyk/theme-language';

export function registerThemeJsonSchemas(
  monaco: Monaco,
  themeId: string,
  workspace: ThemeWorkspaceSnapshot,
): void {
  const sectionTypeEnum = workspace.sectionTypes;

  monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
    validate: true,
    allowComments: false,
    schemas: [
      {
        uri: `zodyk://schema/${themeId}/template.json`,
        fileMatch: [`zodyk://theme/${themeId}/templates/*.json`],
        schema: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            wrapper: { type: 'string' },
            sections: {
              type: 'object',
              additionalProperties: {
                type: 'object',
                properties: {
                  type: { type: 'string', enum: sectionTypeEnum },
                  settings: { type: 'object' },
                  blocks: { type: 'object' },
                  block_order: { type: 'array', items: { type: 'string' } },
                  custom_css: { type: 'string' },
                },
                required: ['type'],
              },
            },
            order: { type: 'array', items: { type: 'string' } },
          },
        },
      },
      {
        uri: `zodyk://schema/${themeId}/settings_schema.json`,
        fileMatch: [`zodyk://theme/${themeId}/config/settings_schema.json`],
        schema: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              settings: { type: 'array' },
            },
            required: ['name', 'settings'],
          },
        },
      },
      {
        uri: `zodyk://schema/${themeId}/settings.json`,
        fileMatch: [`zodyk://theme/${themeId}/config/settings.json`],
        schema: {
          type: 'object',
          properties: {
            current: { type: 'object' },
          },
        },
      },
    ],
  });
}

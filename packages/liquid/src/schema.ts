import { sectionDefinitionSchema, type SectionDefinition } from '@zodyk/core';

const SCHEMA_REGEX = /\{%\s*-?\s*schema\s*-?\s*%\}([\s\S]*?)\{%\s*-?\s*endschema\s*-?\s*%\}/i;

export function splitSectionLiquid(content: string): {
  markup: string;
  schemaJson: string | null;
} {
  const match = content.match(SCHEMA_REGEX);
  if (!match) {
    return { markup: content.trim(), schemaJson: null };
  }
  const markup = content.replace(SCHEMA_REGEX, '').trim();
  return { markup, schemaJson: match[1]?.trim() ?? null };
}

export function parseSectionSchema(content: string): SectionDefinition | null {
  const { schemaJson } = splitSectionLiquid(content);
  if (!schemaJson) return null;
  try {
    const raw = JSON.parse(schemaJson) as unknown;
    const result = sectionDefinitionSchema.safeParse(raw);
    if (result.success) return result.data;
    console.warn('[zodyk] Section schema validation failed:', result.error.flatten());
    return raw as SectionDefinition;
  } catch {
    return null;
  }
}

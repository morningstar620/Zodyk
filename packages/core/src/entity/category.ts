export const ENTITY_CATEGORIES = ['meta_object', 'system'] as const;

export type EntityCategory = (typeof ENTITY_CATEGORIES)[number];

export function isEntityCategory(value: string): value is EntityCategory {
  return (ENTITY_CATEGORIES as readonly string[]).includes(value);
}

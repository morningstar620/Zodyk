import { z } from 'zod';
import type { EntityCategory } from './category';

export const entityReferenceSchema = z.object({
  entityType: z.string().min(1),
  entityId: z.string().min(1),
});

export type EntityReference = z.infer<typeof entityReferenceSchema>;

export function createEntityReference(
  entityType: string,
  entityId: string,
): EntityReference {
  return { entityType, entityId };
}

export function parseEntityReference(value: unknown): EntityReference | null {
  const result = entityReferenceSchema.safeParse(value);
  return result.success ? result.data : null;
}

export function entityReferenceKey(category: EntityCategory, slug: string): string {
  return `${category}:${slug}`;
}

export function parseEntityReferenceKey(key: string): { category: EntityCategory; slug: string } | null {
  const [category, ...rest] = key.split(':');
  const slug = rest.join(':');
  if ((category !== 'meta_object' && category !== 'system') || !slug) {
    return null;
  }
  return { category, slug };
}

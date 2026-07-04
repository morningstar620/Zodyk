import { z } from 'zod';
import { ENTITY_CATEGORIES } from './category';

export const RELATIONSHIP_CARDINALITIES = [
  'one_to_one',
  'one_to_many',
  'many_to_many',
  'self',
] as const;

export type RelationshipCardinality = (typeof RELATIONSHIP_CARDINALITIES)[number];

export const entityRelationshipSchema = z.object({
  key: z
    .string()
    .min(1)
    .regex(/^[a-z][a-z0-9_]*$/, 'Relationship key must be lowercase alphanumeric with underscores'),
  label: z.string().min(1).max(100),
  sourceFieldKey: z.string().min(1),
  targetCategory: z.enum(ENTITY_CATEGORIES as unknown as ['meta_object', 'system']),
  targetSlug: z.string().min(1),
  cardinality: z.enum(RELATIONSHIP_CARDINALITIES as unknown as [RelationshipCardinality, ...RelationshipCardinality[]]),
  selfReference: z.boolean().default(false),
  required: z.boolean().default(false),
  order: z.number().int().min(0).default(0),
});

export type EntityRelationship = z.infer<typeof entityRelationshipSchema>;

export const entityRelationshipsSchema = z.array(entityRelationshipSchema).default([]);

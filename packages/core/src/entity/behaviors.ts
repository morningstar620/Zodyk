import { z } from 'zod';

export const BEHAVIOR_KEYS = [
  'activity_timeline',
  'automation',
  'notifications',
  'file_attachments',
  'comments',
  'notes',
  'version_history',
  'soft_delete',
  'api_access',
  'search',
  'permissions',
] as const;

export type BehaviorKey = (typeof BEHAVIOR_KEYS)[number];

export const behaviorsSchema = z.record(z.string(), z.boolean()).default({});

export type BehaviorsConfig = z.infer<typeof behaviorsSchema>;

export const DEFAULT_BEHAVIORS: BehaviorsConfig = {
  activity_timeline: false,
  automation: false,
  notifications: false,
  file_attachments: false,
  comments: false,
  notes: false,
  version_history: false,
  soft_delete: true,
  api_access: true,
  search: true,
  permissions: true,
};

export interface BehaviorDefinition {
  key: string;
  label: string;
  description?: string;
  defaultEnabled?: boolean;
}

export function mergeBehaviors(input?: BehaviorsConfig): BehaviorsConfig {
  return { ...DEFAULT_BEHAVIORS, ...input };
}

export function isBehaviorEnabled(behaviors: BehaviorsConfig, key: string): boolean {
  return behaviors[key] ?? false;
}

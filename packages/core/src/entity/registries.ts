import { META_FIELD_TYPES, type MetaFieldType } from '../meta/field-types';
import { BEHAVIOR_KEYS, DEFAULT_BEHAVIORS, type BehaviorDefinition } from './behaviors';

export interface RegistryEntry<T = unknown> {
  key: string;
  label: string;
  description?: string;
  metadata?: T;
}

class Registry<T = unknown> {
  private entries = new Map<string, RegistryEntry<T>>();

  register(entry: RegistryEntry<T>): void {
    this.entries.set(entry.key, entry);
  }

  get(key: string): RegistryEntry<T> | undefined {
    return this.entries.get(key);
  }

  list(): RegistryEntry<T>[] {
    return Array.from(this.entries.values());
  }

  has(key: string): boolean {
    return this.entries.has(key);
  }
}

export const fieldTypeRegistry = new Registry<{ type: MetaFieldType }>();
export const behaviorRegistry = new Registry<BehaviorDefinition>();
export const validationRuleRegistry = new Registry();
export const widgetRegistry = new Registry();
export const viewRegistry = new Registry();
export const automationTriggerRegistry = new Registry();
export const automationActionRegistry = new Registry();

function seedFieldTypes(): void {
  const labels: Record<MetaFieldType, string> = {
    text: 'Text',
    rich_text: 'Rich Text',
    number: 'Number',
    boolean: 'Boolean',
    date: 'Date',
    datetime: 'Date & Time',
    url: 'URL',
    code: 'Code',
    json: 'JSON',
    image: 'Image',
    gallery: 'Gallery',
    file: 'File',
    relation: 'Relation',
    entity_reference: 'Entity Reference',
    repeater: 'Repeater',
  };

  for (const type of META_FIELD_TYPES) {
    fieldTypeRegistry.register({
      key: type,
      label: labels[type],
      metadata: { type },
    });
  }
}

function seedBehaviors(): void {
  const labels: Record<string, { label: string; description: string }> = {
    activity_timeline: {
      label: 'Activity Timeline',
      description: 'Track activity events on records',
    },
    automation: {
      label: 'Automation',
      description: 'Enable workflow automations',
    },
    notifications: {
      label: 'Notifications',
      description: 'Send notifications on record events',
    },
    file_attachments: {
      label: 'File Attachments',
      description: 'Attach files to records',
    },
    comments: {
      label: 'Comments',
      description: 'Allow comments on records',
    },
    notes: {
      label: 'Notes',
      description: 'Internal notes on records',
    },
    version_history: {
      label: 'Version History',
      description: 'Track record version history',
    },
    soft_delete: {
      label: 'Soft Delete',
      description: 'Soft delete records instead of hard delete',
    },
    api_access: {
      label: 'API Access',
      description: 'Expose records via REST API',
    },
    search: {
      label: 'Search',
      description: 'Include records in search',
    },
    permissions: {
      label: 'Permissions',
      description: 'Enforce record-level permissions',
    },
  };

  for (const key of BEHAVIOR_KEYS) {
    const meta = labels[key];
    behaviorRegistry.register({
      key,
      label: meta?.label ?? key,
      description: meta?.description,
      metadata: {
        key,
        label: meta?.label ?? key,
        description: meta?.description,
        defaultEnabled: DEFAULT_BEHAVIORS[key] ?? false,
      },
    });
  }
}

seedFieldTypes();
seedBehaviors();

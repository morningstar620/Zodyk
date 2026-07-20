import type { SectionDefinition, ThemeSettingsGroup } from '@zodyk/core';
import type {
  LiquidObjectSchema,
  MetaObjectCatalogEntry,
  SystemEntityCatalogEntry,
  ThemeWorkspaceSnapshot,
} from '../types';

const GLOBAL_OBJECTS: LiquidObjectSchema[] = [
  {
    name: 'shop',
    description: 'Store information.',
    properties: [
      { name: 'name', type: 'string' },
      { name: 'url', type: 'string' },
      { name: 'currency', type: 'string' },
    ],
  },
  {
    name: 'request',
    description: 'Current request context.',
    properties: [
      { name: 'path', type: 'string' },
      { name: 'locale', type: 'string' },
    ],
  },
  {
    name: 'settings',
    description: 'Theme settings from config/settings.json.',
    properties: [],
  },
  {
    name: 'page',
    description: 'Current CMS page (home and page views).',
    properties: [
      { name: 'id', type: 'string' },
      { name: 'title', type: 'string' },
      { name: 'handle', type: 'string' },
      { name: 'slug', type: 'string' },
      { name: 'body', type: 'string' },
      { name: 'template_suffix', type: 'string' },
      { name: 'seo', type: 'object' },
    ],
  },
  {
    name: 'metaobject',
    description: 'Current meta object entry (single view). Fields are dynamic per type.',
    properties: [
      { name: 'id', type: 'string' },
      { name: 'handle', type: 'string' },
      { name: 'status', type: 'string' },
      { name: 'locale', type: 'string' },
      { name: 'template_suffix', type: 'string' },
      { name: 'seo', type: 'object' },
      { name: 'metaobject_type', type: 'object' },
    ],
  },
  {
    name: 'metaobjects',
    description: 'Meta object entries (archive view).',
    properties: [],
  },
  {
    name: 'metaobject_type',
    description: 'Meta object type definition.',
    properties: [
      { name: 'slug', type: 'string' },
      { name: 'name', type: 'string' },
      { name: 'singular_name', type: 'string' },
    ],
  },
  {
    name: 'paginate',
    description: 'Archive pagination info.',
    properties: [
      { name: 'current_page', type: 'number' },
      { name: 'pages', type: 'number' },
      { name: 'items', type: 'number' },
      { name: 'page_size', type: 'number' },
    ],
  },
  {
    name: 'linklists',
    description: 'Navigation menus keyed by handle.',
    properties: [],
  },
  {
    name: 'menus',
    description: 'Alias for linklists.',
    properties: [],
  },
  {
    name: 'routes',
    description: 'Theme route helpers.',
    properties: [{ name: 'root', type: 'string' }],
  },
  {
    name: 'content_for_layout',
    description: 'Rendered page content (layout only).',
    properties: [],
  },
  {
    name: 'content_for_header',
    description: 'Header injection slot (layout only).',
    properties: [],
  },
];

const SECTION_OBJECT: LiquidObjectSchema = {
  name: 'section',
  description: 'Current section instance.',
  properties: [
    { name: 'id', type: 'string' },
    { name: 'type', type: 'string' },
    { name: 'settings', type: 'object' },
    { name: 'blocks', type: 'array' },
    { name: 'block_order', type: 'array' },
  ],
};

const BLOCK_OBJECT: LiquidObjectSchema = {
  name: 'block',
  description: 'Block within a section for loop.',
  properties: [
    { name: 'id', type: 'string' },
    { name: 'type', type: 'string' },
    { name: 'settings', type: 'object' },
  ],
};

export function buildSettingsProperties(schema: ThemeSettingsGroup[]): LiquidObjectProperty[] {
  const props: LiquidObjectProperty[] = [];
  for (const group of schema) {
    for (const setting of group.settings) {
      if (setting.id) {
        props.push({
          name: setting.id,
          type: setting.type,
          description: setting.label ?? setting.info,
        });
      }
    }
  }
  return props;
}

type LiquidObjectProperty = LiquidObjectSchema['properties'][number];

export function buildMetaObjectProperties(entry: MetaObjectCatalogEntry): LiquidObjectProperty[] {
  return entry.fields.map((f) => ({
    name: f.key,
    type: f.type,
    description: f.label,
  }));
}

export function buildSectionSettingsProperties(schema: SectionDefinition | null): LiquidObjectProperty[] {
  if (!schema) return [];
  return schema.settings
    .filter((s) => s.id)
    .map((s) => ({
      name: s.id!,
      type: s.type,
      description: s.label ?? s.info,
    }));
}

export function buildBlockSettingsProperties(
  schema: SectionDefinition | null,
  blockType?: string,
): LiquidObjectProperty[] {
  if (!schema || !blockType) return [];
  const block = schema.blocks.find((b) => b.type === blockType);
  if (!block) return [];
  return block.settings
    .filter((s) => s.id)
    .map((s) => ({
      name: s.id!,
      type: s.type,
      description: s.label ?? s.info,
    }));
}

export class ThemeCatalog {
  private globalObjects: LiquidObjectSchema[];

  constructor(private workspace: ThemeWorkspaceSnapshot) {
    this.globalObjects = GLOBAL_OBJECTS.map((obj) => {
      if (obj.name === 'settings') {
        return {
          ...obj,
          properties: buildSettingsProperties(workspace.settingsSchema),
        };
      }
      return { ...obj };
    });
  }

  updateWorkspace(workspace: ThemeWorkspaceSnapshot): void {
    this.workspace = workspace;
    this.globalObjects = GLOBAL_OBJECTS.map((obj) => {
      if (obj.name === 'settings') {
        return {
          ...obj,
          properties: buildSettingsProperties(workspace.settingsSchema),
        };
      }
      return { ...obj };
    });
  }

  getGlobalObjects(): LiquidObjectSchema[] {
    return this.globalObjects;
  }

  getObject(name: string, context?: { sectionType?: string; blockType?: string; metaObjectSlug?: string }): LiquidObjectSchema | undefined {
    const root = name.split('.')[0];
    if (root === 'section') {
      const schema = context?.sectionType
        ? this.workspace.sectionSchemas[context.sectionType]
        : null;
      const settingsProps = buildSectionSettingsProperties(schema ?? null);
      if (name.startsWith('section.settings.')) {
        const settingId = name.slice('section.settings.'.length).split('.')[0] ?? '';
        const prop = settingsProps.find((p) => p.name === settingId);
        return prop && settingId
          ? { name: settingId, properties: [], description: prop.description }
          : undefined;
      }
      if (name === 'section.settings') {
        return { name: 'settings', description: 'Section settings.', properties: settingsProps };
      }
      return SECTION_OBJECT;
    }
    if (root === 'block') {
      const schema = context?.sectionType
        ? this.workspace.sectionSchemas[context.sectionType]
        : null;
      if (name.startsWith('block.settings.')) {
        const props = buildBlockSettingsProperties(schema ?? null, context?.blockType);
        const settingId = name.slice('block.settings.'.length).split('.')[0] ?? '';
        const prop = props.find((p) => p.name === settingId);
        return prop && settingId
          ? { name: settingId, properties: [], description: prop.description }
          : undefined;
      }
      if (name === 'block.settings') {
        return {
          name: 'settings',
          description: 'Block settings.',
          properties: buildBlockSettingsProperties(schema ?? null, context?.blockType),
        };
      }
      return BLOCK_OBJECT;
    }
    if (root === 'metaobject') {
      const slug = context?.metaObjectSlug;
      const entry = slug
        ? this.workspace.metaObjects.find((m) => m.slug === slug)
        : this.workspace.metaObjects[0];
      const fieldProps = entry ? buildMetaObjectProperties(entry) : [];
      if (name.startsWith('metaobject.')) {
        const fieldKey = name.slice('metaobject.'.length).split('.')[0] ?? '';
        const prop = fieldProps.find((p) => p.name === fieldKey);
        return prop && fieldKey
          ? { name: fieldKey, properties: [], description: prop.description }
          : undefined;
      }
      return {
        name: 'metaobject',
        description: 'Current meta object entry.',
        properties: [...GLOBAL_OBJECTS.find((o) => o.name === 'metaobject')!.properties, ...fieldProps],
      };
    }
    return this.globalObjects.find((o) => o.name === root);
  }

  getMetaObject(slug: string): MetaObjectCatalogEntry | undefined {
    return this.workspace.metaObjects.find((m) => m.slug === slug);
  }

  getSystemEntity(slug: string): SystemEntityCatalogEntry | undefined {
    return this.workspace.systemEntities.find((e) => e.slug === slug);
  }

  getSectionTypes(): string[] {
    return this.workspace.sectionTypes;
  }

  getSnippets(): string[] {
    return this.workspace.snippets;
  }

  getSettingTypes(): string[] {
    return [
      'header', 'paragraph', 'text', 'textarea', 'richtext', 'inline_richtext',
      'image', 'gallery', 'color', 'color_background', 'range', 'select', 'radio',
      'checkbox', 'url', 'number', 'text_alignment', 'font_picker', 'video',
      'video_url', 'file', 'page', 'metaobject', 'link_list', 'spacing',
      'typography', 'repeater', 'meta_object_relation', 'page_relation',
    ];
  }

  getMetaFieldTypes(): string[] {
    return [
      'text', 'rich_text', 'number', 'boolean', 'date', 'datetime', 'url',
      'code', 'json', 'image', 'gallery', 'file', 'relation', 'entity_reference', 'repeater',
    ];
  }

  getLocaleKeys(): string[] {
    return Object.keys(this.workspace.locales);
  }
}

export { GLOBAL_OBJECTS, SECTION_OBJECT, BLOCK_OBJECT };

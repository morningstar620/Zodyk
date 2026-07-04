import type { StateCreator } from 'zustand';
import type { SectionDefinition, SectionSetting, TemplateJson } from '@zodyk/core';
import type { CustomizerSnapshot, PageOption, SchemasData, ThemeMeta } from './types';

function cloneTemplate(template: TemplateJson): TemplateJson {
  return JSON.parse(JSON.stringify(template)) as TemplateJson;
}

function generateBlockId(type: string): string {
  return `${type}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

export interface TemplateSlice {
  themeMeta: ThemeMeta;
  page: PageOption | null;
  pageOptions: PageOption[];
  templateJson: TemplateJson;
  themeSettings: Record<string, unknown>;
  sectionSchemas: Record<string, SectionDefinition>;
  sectionTypeList: string[];
  settingsSchema: Array<{ name: string; settings: SectionSetting[] }>;
  dirty: boolean;
  saving: boolean;
  setThemeMeta: (meta: Partial<ThemeMeta> & { themeId: string }) => void;
  setSchemas: (data: SchemasData) => void;
  mergeSectionSchemas: (schemas: Record<string, SectionDefinition>) => void;
  setPage: (page: PageOption) => void;
  setPageOptions: (pages: PageOption[]) => void;
  setTemplateJson: (template: TemplateJson) => void;
  setThemeSettings: (settings: Record<string, unknown>) => void;
  updateSectionSettings: (sectionId: string, settings: Record<string, unknown>) => void;
  updateSectionCustomCss: (sectionId: string, customCss: string) => void;
  reorderSections: (order: string[]) => void;
  addSection: (type: string, presetName?: string, insertAt?: 'header' | 'template' | 'footer') => string | null;
  removeSection: (sectionId: string) => void;
  duplicateSection: (sectionId: string) => string | null;
  addBlock: (sectionId: string, blockType: string) => string | null;
  removeBlock: (sectionId: string, blockId: string) => void;
  reorderBlocks: (sectionId: string, blockOrder: string[]) => void;
  updateBlockSettings: (sectionId: string, blockId: string, settings: Record<string, unknown>) => void;
  setDirty: (dirty: boolean) => void;
  setSaving: (saving: boolean) => void;
}

export const createTemplateSlice: StateCreator<
  TemplateSlice & HistorySlice & EditorSlice & MetaSlice & SyncSlice,
  [],
  [],
  TemplateSlice
> = (set, get) => ({
  themeMeta: {
    themeId: '',
    themeName: 'Theme',
    previewToken: '',
    websiteUrl: 'http://localhost:3001',
  },
  page: null,
  pageOptions: [],
  templateJson: { sections: {}, order: [] },
  themeSettings: {},
  sectionSchemas: {},
  sectionTypeList: [],
  settingsSchema: [],
  dirty: false,
  saving: false,

  setThemeMeta: (meta) =>
    set((s) => ({ themeMeta: { ...s.themeMeta, ...meta } })),

  setSchemas: (data) =>
    set({
      sectionSchemas: data.sectionSchemas,
      sectionTypeList: data.sectionTypeList ?? Object.keys(data.sectionSchemas),
      settingsSchema: data.settingsSchema,
      themeSettings: data.themeSettings,
    }),

  mergeSectionSchemas: (schemas) =>
    set((s) => ({
      sectionSchemas: { ...s.sectionSchemas, ...schemas },
    })),

  setPage: (page) => set({ page, selectedSectionId: null, selectedBlockId: null }),

  setPageOptions: (pageOptions) => set({ pageOptions }),

  setTemplateJson: (template) => set({ templateJson: template }),

  setThemeSettings: (settings) => set({ themeSettings: settings, dirty: true }),

  updateSectionSettings: (sectionId, settings) => {
    const { templateJson } = get();
    const section = templateJson.sections[sectionId];
    if (!section) return;
    set({
      templateJson: {
        ...templateJson,
        sections: {
          ...templateJson.sections,
          [sectionId]: { ...section, settings: { ...section.settings, ...settings } },
        },
      },
      dirty: true,
    });
    get().bumpPartialPreview(sectionId);
  },

  updateSectionCustomCss: (sectionId, customCss) => {
    const { templateJson } = get();
    const section = templateJson.sections[sectionId];
    if (!section) return;
    set({
      templateJson: {
        ...templateJson,
        sections: {
          ...templateJson.sections,
          [sectionId]: { ...section, custom_css: customCss },
        },
      },
      dirty: true,
    });
    get().bumpPartialPreview(sectionId);
  },

  reorderSections: (order) => {
    const { templateJson } = get();
    set({ templateJson: { ...templateJson, order }, dirty: true });
    get().refreshPreview();
  },

  addSection: (type, presetName, insertAt = 'template') => {
    const { templateJson, sectionSchemas } = get();
    const schema = sectionSchemas[type];
    if (!schema) return null;
    const preset =
      schema.presets?.find((p) => !presetName || p.name === presetName) ?? schema.presets?.[0];
    const id = `${type}_${Date.now().toString(36)}`;
    const blocks: Record<string, { type: string; settings: Record<string, unknown> }> = {};
    const blockOrder: string[] = [];
    if (preset?.blocks) {
      for (const b of preset.blocks) {
        const bid = generateBlockId(b.type);
        blocks[bid] = { type: b.type, settings: { ...(b.settings ?? {}) } };
        blockOrder.push(bid);
      }
    }
    const newSection = {
      type,
      settings: { ...(preset?.settings ?? {}) },
      ...(blockOrder.length > 0 ? { blocks, block_order: blockOrder } : {}),
    };
    const { header, template, footer } = awaitImportGroupSections(templateJson);
    let order: string[];
    if (insertAt === 'header') order = [...header, id, ...template, ...footer];
    else if (insertAt === 'footer') order = [...header, ...template, ...footer, id];
    else order = [...header, ...template, id, ...footer];
    set({
      templateJson: {
        ...templateJson,
        sections: { ...templateJson.sections, [id]: newSection },
        order,
      },
      dirty: true,
    });
    get().refreshPreview();
    return id;
  },

  removeSection: (sectionId) => {
    const { templateJson } = get();
    const { [sectionId]: removed, ...sections } = templateJson.sections;
    void removed;
    set({
      templateJson: {
        ...templateJson,
        sections,
        order: templateJson.order.filter((id) => id !== sectionId),
      },
      selectedSectionId: null,
      selectedBlockId: null,
      dirty: true,
    });
    get().refreshPreview();
  },

  duplicateSection: (sectionId) => {
    const { templateJson } = get();
    const section = templateJson.sections[sectionId];
    if (!section) return null;
    const id = `${section.type}_${Date.now().toString(36)}`;
    const cloned = cloneTemplate({ sections: { [id]: section }, order: [id] }).sections[id]!;
    const idx = templateJson.order.indexOf(sectionId);
    const order = [...templateJson.order];
    order.splice(idx + 1, 0, id);
    set({
      templateJson: {
        ...templateJson,
        sections: { ...templateJson.sections, [id]: cloned },
        order,
      },
      dirty: true,
    });
    get().refreshPreview();
    return id;
  },

  addBlock: (sectionId, blockType) => {
    const { templateJson, sectionSchemas } = get();
    const section = templateJson.sections[sectionId];
    if (!section) return null;
    const schema = sectionSchemas[section.type];
    const blockDef = schema?.blocks?.find((b) => b.type === blockType);
    if (!blockDef) return null;
    const existing = section.block_order ?? Object.keys(section.blocks ?? {});
    const sameType = existing.filter((id) => section.blocks?.[id]?.type === blockType);
    if (blockDef.limit && sameType.length >= blockDef.limit) return null;
    if (schema?.max_blocks && existing.length >= schema.max_blocks) return null;
    const blockId = generateBlockId(blockType);
    const defaults: Record<string, unknown> = {};
    for (const s of blockDef.settings) {
      if (s.default !== undefined && s.id) defaults[s.id] = s.default;
    }
    set({
      templateJson: {
        ...templateJson,
        sections: {
          ...templateJson.sections,
          [sectionId]: {
            ...section,
            blocks: { ...(section.blocks ?? {}), [blockId]: { type: blockType, settings: defaults } },
            block_order: [...existing, blockId],
          },
        },
      },
      dirty: true,
    });
    get().refreshPreview();
    return blockId;
  },

  removeBlock: (sectionId, blockId) => {
    const { templateJson } = get();
    const section = templateJson.sections[sectionId];
    if (!section?.blocks) return;
    const { [blockId]: removedBlock, ...blocks } = section.blocks;
    void removedBlock;
    set({
      templateJson: {
        ...templateJson,
        sections: {
          ...templateJson.sections,
          [sectionId]: {
            ...section,
            blocks,
            block_order: (section.block_order ?? []).filter((id) => id !== blockId),
          },
        },
      },
      dirty: true,
    });
    get().refreshPreview();
  },

  reorderBlocks: (sectionId, blockOrder) => {
    const { templateJson } = get();
    const section = templateJson.sections[sectionId];
    if (!section) return;
    set({
      templateJson: {
        ...templateJson,
        sections: {
          ...templateJson.sections,
          [sectionId]: { ...section, block_order: blockOrder },
        },
      },
      dirty: true,
    });
    get().refreshPreview();
  },

  updateBlockSettings: (sectionId, blockId, settings) => {
    const { templateJson } = get();
    const section = templateJson.sections[sectionId];
    const block = section?.blocks?.[blockId];
    if (!section || !block) return;
    set({
      templateJson: {
        ...templateJson,
        sections: {
          ...templateJson.sections,
          [sectionId]: {
            ...section,
            blocks: {
              ...section.blocks,
              [blockId]: { ...block, settings: { ...block.settings, ...settings } },
            },
          },
        },
      },
      dirty: true,
    });
    get().bumpPartialPreview(sectionId);
  },

  setDirty: (dirty) => set({ dirty }),
  setSaving: (saving) => set({ saving }),
});

function awaitImportGroupSections(template: TemplateJson) {
  const header: string[] = [];
  const footer: string[] = [];
  const templateSections: string[] = [];
  for (const id of template.order) {
    const section = template.sections[id];
    if (!section) continue;
    if (section.type === 'header') header.push(id);
    else if (section.type === 'footer') footer.push(id);
    else templateSections.push(id);
  }
  return { header, template: templateSections, footer };
}

// Forward declarations for slice types used in StateCreator generic
import type { HistorySlice } from './history-slice';
import type { EditorSlice } from './editor-slice';
import type { MetaSlice } from './meta-slice';
import type { SyncSlice } from './sync-slice';

export type { CustomizerSnapshot };

import type { SectionDefinition, SectionSetting, TemplateJson } from '@zodyk/core';
import { create } from 'zustand';

export type EditorMode = 'sections' | 'theme_settings';
export type DeviceMode = 'desktop' | 'mobile';

export interface PageOption {
  id: string;
  label: string;
  templatePath: string;
  pathname: string;
  group: string;
}

interface CustomizerSnapshot {
  templateJson: TemplateJson;
  themeSettings: Record<string, unknown>;
}

export interface CustomizerState {
  themeId: string;
  previewToken: string;
  websiteUrl: string;
  mode: EditorMode;
  device: DeviceMode;
  page: PageOption | null;
  pageOptions: PageOption[];
  templateJson: TemplateJson;
  themeSettings: Record<string, unknown>;
  sectionSchemas: Record<string, SectionDefinition>;
  settingsSchema: Array<{ name: string; settings: SectionSetting[] }>;
  selectedSectionId: string | null;
  dirty: boolean;
  saving: boolean;
  undoStack: CustomizerSnapshot[];
  redoStack: CustomizerSnapshot[];
  setThemeMeta: (meta: {
    themeId: string;
    previewToken: string;
    websiteUrl: string;
  }) => void;
  setSchemas: (data: {
    sectionSchemas: Record<string, SectionDefinition>;
    settingsSchema: Array<{ name: string; settings: SectionSetting[] }>;
    themeSettings: Record<string, unknown>;
  }) => void;
  setPage: (page: PageOption) => void;
  setPageOptions: (pages: PageOption[]) => void;
  setTemplateJson: (template: TemplateJson) => void;
  setThemeSettings: (settings: Record<string, unknown>) => void;
  selectSection: (sectionId: string | null) => void;
  setMode: (mode: EditorMode) => void;
  setDevice: (device: DeviceMode) => void;
  updateSectionSettings: (sectionId: string, settings: Record<string, unknown>) => void;
  reorderSections: (order: string[]) => void;
  addSection: (type: string, presetName?: string) => void;
  removeSection: (sectionId: string) => void;
  pushHistory: () => void;
  undo: () => void;
  redo: () => void;
  setDirty: (dirty: boolean) => void;
  setSaving: (saving: boolean) => void;
}

function cloneTemplate(template: TemplateJson): TemplateJson {
  return JSON.parse(JSON.stringify(template)) as TemplateJson;
}

export const useCustomizerStore = create<CustomizerState>((set, get) => ({
  themeId: '',
  previewToken: '',
  websiteUrl: 'http://localhost:3001',
  mode: 'sections',
  device: 'desktop',
  page: null,
  pageOptions: [],
  templateJson: { sections: {}, order: [] },
  themeSettings: {},
  sectionSchemas: {},
  settingsSchema: [],
  selectedSectionId: null,
  dirty: false,
  saving: false,
  undoStack: [],
  redoStack: [],
  setThemeMeta: (meta) => set(meta),
  setSchemas: (data) =>
    set({
      sectionSchemas: data.sectionSchemas,
      settingsSchema: data.settingsSchema,
      themeSettings: data.themeSettings,
    }),
  setPage: (page) => set({ page, selectedSectionId: null }),
  setPageOptions: (pageOptions) => set({ pageOptions }),
  setTemplateJson: (template) => set({ templateJson: template }),
  setThemeSettings: (settings) => set({ themeSettings: settings, dirty: true }),
  selectSection: (sectionId) => set({ selectedSectionId: sectionId, mode: 'sections' }),
  setMode: (mode) => set({ mode, selectedSectionId: mode === 'theme_settings' ? null : get().selectedSectionId }),
  setDevice: (device) => set({ device }),
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
  },
  reorderSections: (order) => {
    const { templateJson } = get();
    set({ templateJson: { ...templateJson, order }, dirty: true });
  },
  addSection: (type, presetName) => {
    const { templateJson, sectionSchemas } = get();
    const schema = sectionSchemas[type];
    const preset = schema?.presets?.find((p) => !presetName || p.name === presetName) ?? schema?.presets?.[0];
    const id = `${type}_${Date.now().toString(36)}`;
    set({
      templateJson: {
        ...templateJson,
        sections: {
          ...templateJson.sections,
          [id]: {
            type,
            settings: { ...(preset?.settings ?? {}) },
          },
        },
        order: [...templateJson.order, id],
      },
      selectedSectionId: id,
      dirty: true,
    });
  },
  removeSection: (sectionId) => {
    const { templateJson } = get();
    const { [sectionId]: _, ...sections } = templateJson.sections;
    set({
      templateJson: {
        ...templateJson,
        sections,
        order: templateJson.order.filter((id) => id !== sectionId),
      },
      selectedSectionId: null,
      dirty: true,
    });
  },
  pushHistory: () => {
    const { templateJson, themeSettings, undoStack } = get();
    set({
      undoStack: [...undoStack.slice(-19), { templateJson: cloneTemplate(templateJson), themeSettings: { ...themeSettings } }],
      redoStack: [],
    });
  },
  undo: () => {
    const { undoStack, redoStack, templateJson, themeSettings } = get();
    if (undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1]!;
    set({
      undoStack: undoStack.slice(0, -1),
      redoStack: [...redoStack, { templateJson: cloneTemplate(templateJson), themeSettings: { ...themeSettings } }],
      templateJson: prev.templateJson,
      themeSettings: prev.themeSettings,
      dirty: true,
    });
  },
  redo: () => {
    const { redoStack, undoStack, templateJson, themeSettings } = get();
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1]!;
    set({
      redoStack: redoStack.slice(0, -1),
      undoStack: [...undoStack, { templateJson: cloneTemplate(templateJson), themeSettings: { ...themeSettings } }],
      templateJson: next.templateJson,
      themeSettings: next.themeSettings,
      dirty: true,
    });
  },
  setDirty: (dirty) => set({ dirty }),
  setSaving: (saving) => set({ saving }),
}));

export function groupSections(template: TemplateJson) {
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

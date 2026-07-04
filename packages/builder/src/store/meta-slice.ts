import type { StateCreator } from 'zustand';
import { loadEditorMeta, saveEditorMeta, trackRecentlyUsed } from '../lib/editor-meta';
import type { EditorMeta } from './types';
import type { TemplateSlice } from './template-slice';
import type { HistorySlice } from './history-slice';
import type { EditorSlice } from './editor-slice';
import type { SyncSlice } from './sync-slice';

export interface MetaSlice {
  editorMeta: EditorMeta;
  initEditorMeta: (themeId: string) => void;
  setDisplayName: (targetId: string, name: string) => void;
  toggleSectionHidden: (sectionId: string) => void;
  isSectionHidden: (sectionId: string) => boolean;
  trackSectionUsed: (sectionType: string) => void;
  toggleAccordion: (groupId: string) => void;
  isAccordionExpanded: (groupId: string, defaultExpanded?: boolean) => boolean;
  toggleSectionExpanded: (sectionId: string) => void;
  isSectionExpanded: (sectionId: string) => boolean;
}

export const createMetaSlice: StateCreator<
  TemplateSlice & HistorySlice & EditorSlice & MetaSlice & SyncSlice,
  [],
  [],
  MetaSlice
> = (set, get) => ({
  editorMeta: {
    displayNames: {},
    hiddenSections: {},
    recentlyUsedSections: [],
    accordionExpanded: {},
    expandedSections: {},
  },

  initEditorMeta: (themeId) => {
    set({ editorMeta: loadEditorMeta(themeId) });
  },

  setDisplayName: (targetId, name) => {
    const { editorMeta, themeMeta } = get();
    const next = {
      ...editorMeta,
      displayNames: { ...editorMeta.displayNames, [targetId]: name },
    };
    set({ editorMeta: next });
    saveEditorMeta(themeMeta.themeId, next);
  },

  toggleSectionHidden: (sectionId) => {
    const { editorMeta, themeMeta } = get();
    const next = {
      ...editorMeta,
      hiddenSections: {
        ...editorMeta.hiddenSections,
        [sectionId]: !editorMeta.hiddenSections[sectionId],
      },
    };
    set({ editorMeta: next });
    saveEditorMeta(themeMeta.themeId, next);
    get().refreshPreview();
  },

  isSectionHidden: (sectionId) => !!get().editorMeta.hiddenSections[sectionId],

  trackSectionUsed: (sectionType) => {
    const { editorMeta, themeMeta } = get();
    const next = trackRecentlyUsed(editorMeta, sectionType);
    set({ editorMeta: next });
    saveEditorMeta(themeMeta.themeId, next);
  },

  toggleAccordion: (groupId) => {
    const { editorMeta, themeMeta } = get();
    const next = {
      ...editorMeta,
      accordionExpanded: {
        ...editorMeta.accordionExpanded,
        [groupId]: !editorMeta.accordionExpanded[groupId],
      },
    };
    set({ editorMeta: next });
    saveEditorMeta(themeMeta.themeId, next);
  },

  isAccordionExpanded: (groupId, defaultExpanded = false) => {
    const val = get().editorMeta.accordionExpanded[groupId];
    return val !== undefined ? val : defaultExpanded;
  },

  toggleSectionExpanded: (sectionId) => {
    const { editorMeta, themeMeta } = get();
    const next = {
      ...editorMeta,
      expandedSections: {
        ...editorMeta.expandedSections,
        [sectionId]: !editorMeta.expandedSections[sectionId],
      },
    };
    set({ editorMeta: next });
    saveEditorMeta(themeMeta.themeId, next);
  },

  isSectionExpanded: (sectionId) => {
    const schema = get().sectionSchemas[get().templateJson.sections[sectionId]?.type ?? ''];
    const hasBlocks = (schema?.blocks?.length ?? 0) > 0;
    if (!hasBlocks) return false;
    const val = get().editorMeta.expandedSections[sectionId];
    return val !== undefined ? val : false;
  },
});

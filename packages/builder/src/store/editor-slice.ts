import type { StateCreator } from 'zustand';
import type { DeviceMode, EditorMode, HoverTarget } from './types';
import type { TemplateSlice } from './template-slice';
import type { HistorySlice } from './history-slice';
import type { MetaSlice } from './meta-slice';
import type { SyncSlice } from './sync-slice';

export interface EditorSlice {
  mode: EditorMode;
  device: DeviceMode;
  inspectorMode: boolean;
  selectedSectionId: string | null;
  selectedBlockId: string | null;
  hoveredTarget: HoverTarget | null;
  settingsSearch: string;
  addSectionDialogGroup: 'header' | 'template' | 'footer' | null;
  previewRefreshKey: number;
  setMode: (mode: EditorMode) => void;
  setDevice: (device: DeviceMode) => void;
  setInspectorMode: (enabled: boolean) => void;
  selectSection: (sectionId: string | null, blockId?: string | null) => void;
  selectBlock: (sectionId: string, blockId: string | null) => void;
  clearSelection: () => void;
  setHoveredTarget: (target: HoverTarget | null) => void;
  setSettingsSearch: (query: string) => void;
  openAddSectionDialog: (group: 'header' | 'template' | 'footer') => void;
  closeAddSectionDialog: () => void;
  refreshPreview: () => void;
}

export const createEditorSlice: StateCreator<
  TemplateSlice & HistorySlice & EditorSlice & MetaSlice & SyncSlice,
  [],
  [],
  EditorSlice
> = (set, get) => ({
  mode: 'sections',
  device: 'desktop',
  inspectorMode: true,
  selectedSectionId: null,
  selectedBlockId: null,
  hoveredTarget: null,
  settingsSearch: '',
  addSectionDialogGroup: null,
  previewRefreshKey: 0,

  setMode: (mode) =>
    set({
      mode,
      selectedBlockId: mode === 'theme_settings' ? null : get().selectedBlockId,
      selectedSectionId: mode === 'theme_settings' ? null : get().selectedSectionId,
      settingsSearch: mode !== get().mode ? '' : get().settingsSearch,
      addSectionDialogGroup: mode === 'theme_settings' ? null : get().addSectionDialogGroup,
    }),

  setDevice: (device) => set({ device }),

  setInspectorMode: (inspectorMode) =>
    set({
      inspectorMode,
      hoveredTarget: inspectorMode ? get().hoveredTarget : null,
    }),

  selectSection: (sectionId, blockId = null) =>
    set({
      selectedSectionId: sectionId,
      selectedBlockId: blockId ?? null,
      mode: 'sections',
    }),

  selectBlock: (sectionId, blockId) =>
    set({
      selectedSectionId: sectionId,
      selectedBlockId: blockId,
      mode: 'sections',
    }),

  clearSelection: () =>
    set({
      selectedSectionId: null,
      selectedBlockId: null,
      settingsSearch: '',
      mode: 'sections',
    }),

  setHoveredTarget: (hoveredTarget) => set({ hoveredTarget }),

  setSettingsSearch: (settingsSearch) => set({ settingsSearch }),

  openAddSectionDialog: (group) => set({ addSectionDialogGroup: group }),

  closeAddSectionDialog: () => set({ addSectionDialogGroup: null }),

  refreshPreview: () => set((s) => ({ previewRefreshKey: s.previewRefreshKey + 1 })),
});

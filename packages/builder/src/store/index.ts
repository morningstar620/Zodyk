import { create } from 'zustand';
import { createEditorSlice, type EditorSlice } from './editor-slice';
import { createHistorySlice, type HistorySlice } from './history-slice';
import { createMetaSlice, type MetaSlice } from './meta-slice';
import { createSyncSlice, type SyncSlice } from './sync-slice';
import { createTemplateSlice, type TemplateSlice } from './template-slice';

export type CustomizerState = TemplateSlice & HistorySlice & EditorSlice & MetaSlice & SyncSlice;

export const useCustomizerStore = create<CustomizerState>()((...args) => ({
  ...createTemplateSlice(...args),
  ...createHistorySlice(...args),
  ...createEditorSlice(...args),
  ...createMetaSlice(...args),
  ...createSyncSlice(...args),
}));

export { groupSections, rebuildOrder } from '../lib/group-sections';
export type {
  PageOption,
  EditorMode,
  DeviceMode,
  SectionGroupName,
  EditorMeta,
  HoverTarget,
  ThemeMeta,
} from './types';
export type { SyncState } from './sync-slice';

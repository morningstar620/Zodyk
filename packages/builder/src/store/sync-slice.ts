import type { StateCreator } from 'zustand';
import type { TemplateSlice } from './template-slice';
import type { HistorySlice } from './history-slice';
import type { EditorSlice } from './editor-slice';
import type { MetaSlice } from './meta-slice';

export type SyncState = 'idle' | 'pending' | 'syncing' | 'saved' | 'error';

export interface SyncSlice {
  syncState: SyncState;
  syncProgress: number | null;
  partialPreviewSeq: number;
  partialPreviewSectionId: string | null;
  setSyncState: (state: SyncState, progress?: number | null) => void;
  bumpPartialPreview: (sectionId: string) => void;
}

export const createSyncSlice: StateCreator<
  TemplateSlice & HistorySlice & EditorSlice & MetaSlice & SyncSlice,
  [],
  [],
  SyncSlice
> = (set) => ({
  syncState: 'idle',
  syncProgress: null,
  partialPreviewSeq: 0,
  partialPreviewSectionId: null,

  setSyncState: (syncState, syncProgress = null) => set({ syncState, syncProgress }),

  bumpPartialPreview: (sectionId) =>
    set((s) => ({
      partialPreviewSeq: s.partialPreviewSeq + 1,
      partialPreviewSectionId: sectionId,
    })),
});

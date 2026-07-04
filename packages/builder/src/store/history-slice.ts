import type { StateCreator } from 'zustand';
import type { CustomizerSnapshot } from './types';
import type { TemplateSlice } from './template-slice';
import type { EditorSlice } from './editor-slice';
import type { MetaSlice } from './meta-slice';
import type { SyncSlice } from './sync-slice';
import type { TemplateJson } from '@zodyk/core';

function cloneTemplate(template: TemplateJson): TemplateJson {
  return JSON.parse(JSON.stringify(template)) as TemplateJson;
}

export interface HistorySlice {
  undoStack: CustomizerSnapshot[];
  redoStack: CustomizerSnapshot[];
  pushHistory: () => void;
  undo: () => void;
  redo: () => void;
}

export const createHistorySlice: StateCreator<
  TemplateSlice & HistorySlice & EditorSlice & MetaSlice & SyncSlice,
  [],
  [],
  HistorySlice
> = (set, get) => ({
  undoStack: [],
  redoStack: [],

  pushHistory: () => {
    const { templateJson, themeSettings, undoStack } = get();
    set({
      undoStack: [
        ...undoStack.slice(-19),
        { templateJson: cloneTemplate(templateJson), themeSettings: { ...themeSettings } },
      ],
      redoStack: [],
    });
  },

  undo: () => {
    const { undoStack, redoStack, templateJson, themeSettings } = get();
    if (undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1]!;
    set({
      undoStack: undoStack.slice(0, -1),
      redoStack: [
        ...redoStack,
        { templateJson: cloneTemplate(templateJson), themeSettings: { ...themeSettings } },
      ],
      templateJson: prev.templateJson,
      themeSettings: prev.themeSettings,
      dirty: true,
    });
    get().refreshPreview();
  },

  redo: () => {
    const { redoStack, undoStack, templateJson, themeSettings } = get();
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1]!;
    set({
      redoStack: redoStack.slice(0, -1),
      undoStack: [
        ...undoStack,
        { templateJson: cloneTemplate(templateJson), themeSettings: { ...themeSettings } },
      ],
      templateJson: next.templateJson,
      themeSettings: next.themeSettings,
      dirty: true,
    });
    get().refreshPreview();
  },
});

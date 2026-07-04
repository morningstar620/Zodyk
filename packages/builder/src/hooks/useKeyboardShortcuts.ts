'use client';

import { useEffect } from 'react';
import { useCustomizerStore } from '../store';

interface UseKeyboardShortcutsOptions {
  onSave: () => void;
}

export function useKeyboardShortcuts({ onSave }: UseKeyboardShortcutsOptions) {
  const { undo, redo, clearSelection, selectedSectionId, selectedBlockId, removeSection, removeBlock, pushHistory } =
    useCustomizerStore();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        onSave();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && e.shiftKey) {
        e.preventDefault();
        redo();
      }
      if (e.key === 'Escape') {
        clearSelection();
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;
        if (selectedBlockId && selectedSectionId) {
          e.preventDefault();
          pushHistory();
          removeBlock(selectedSectionId, selectedBlockId);
        } else if (selectedSectionId) {
          e.preventDefault();
          if (confirm('Remove this section?')) {
            pushHistory();
            removeSection(selectedSectionId);
          }
        }
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    onSave,
    undo,
    redo,
    clearSelection,
    selectedSectionId,
    selectedBlockId,
    removeSection,
    removeBlock,
    pushHistory,
  ]);
}

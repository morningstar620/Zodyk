'use client';

import { cn } from '@zodyk/shared-ui';
import { ChevronDown, Redo2, Undo2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import {
  editorGhostButtonClass,
  editorHeaderClass,
  editorIconButtonClass,
} from './media-editor-classes';

type MediaEditorHeaderProps = {
  title: string;
  onBack: () => void;
  onDiscard: () => void;
  onSave: () => void;
  onSaveAsNew: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  saving?: boolean;
};

export function MediaEditorHeader({
  title,
  onBack,
  onDiscard,
  onSave,
  onSaveAsNew,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
  saving = false,
}: MediaEditorHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;

    const close = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [menuOpen]);

  return (
    <header className={editorHeaderClass}>
      <button
        type="button"
        onClick={onBack}
        className="flex min-w-0 cursor-pointer items-center gap-2.5 text-left"
      >
        <span className="flex h-6 w-8 shrink-0 items-center justify-center text-muted-foreground">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 16 16"
            width="16"
            height="16"
            className="h-4 w-4"
            aria-hidden
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M9.75 8a.75.75 0 0 1-.75.75h-4.19l.97.97a.75.75 0 1 1-1.06 1.06l-2.25-2.25a.75.75 0 0 1 0-1.06l2.25-2.25a.75.75 0 0 1 1.06 1.06l-.97.97h4.19a.75.75 0 0 1 .75.75"
            />
            <path
              fillRule="evenodd"
              d="M1.5 3.75a2.25 2.25 0 0 1 2.25-2.25h8.5a2.25 2.25 0 0 1 2.25 2.25v8.5a2.25 2.25 0 0 1-2.25 2.25h-8.5a2.25 2.25 0 0 1-2.25-2.25.75.75 0 0 1 1.5 0c0 .414.336.75.75.75h8.5a.75.75 0 0 0 .75-.75v-8.5a.75.75 0 0 0-.75-.75h-8.5a.75.75 0 0 0-.75.75.75.75 0 0 1-1.5 0"
            />
          </svg>
        </span>
        <span className="truncate text-sm text-foreground">{title}</span>
      </button>

      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={!canUndo}
          onClick={onUndo}
          className={editorIconButtonClass(canUndo)}
          aria-label="Undo"
        >
          <Undo2 className="h-4 w-4" />
        </button>
        <button
          type="button"
          disabled={!canRedo}
          onClick={onRedo}
          className={editorIconButtonClass(canRedo)}
          aria-label="Redo"
        >
          <Redo2 className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={onDiscard}
          disabled={saving}
          className={editorGhostButtonClass}
        >
          Discard
        </button>

        <div ref={menuRef} className="relative">
          <div className="flex overflow-hidden rounded-lg border border-border/50">
            <button
              type="button"
              onClick={onSave}
              disabled={saving}
              className="h-8 cursor-pointer bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => setMenuOpen((open) => !open)}
              className="flex h-8 cursor-pointer items-center border-l border-border/50 bg-primary px-1.5 text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Save options"
              aria-expanded={menuOpen}
              aria-haspopup="menu"
            >
              <ChevronDown className={cn('h-4 w-4 transition-transform', menuOpen && 'rotate-180')} />
            </button>
          </div>

          {menuOpen && (
            <div
              role="menu"
              className="absolute top-full right-0 z-50 mt-1 min-w-[10.5rem] overflow-hidden rounded-lg border border-border/50 bg-card py-1 shadow-lg"
            >
              <button
                type="button"
                role="menuitem"
                disabled={saving}
                onClick={() => {
                  setMenuOpen(false);
                  onSaveAsNew();
                }}
                className="flex w-full cursor-pointer px-3 py-2 text-left text-sm text-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
              >
                Save as New
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

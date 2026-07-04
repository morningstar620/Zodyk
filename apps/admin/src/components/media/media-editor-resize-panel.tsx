'use client';

import { cn } from '@zodyk/shared-ui';
import { ChevronDown, Link2, Maximize2, Unlink2 } from 'lucide-react';
import {
  editorApplyButtonClass,
  editorInputClass,
  editorPanelBodyClass,
  editorPanelClass,
  editorPanelToggleClass,
  editorToggleButtonClass,
} from './media-editor-classes';

type MediaEditorResizePanelProps = {
  expanded: boolean;
  onToggle: () => void;
  width: string;
  height: string;
  lockAspect: boolean;
  onWidthChange: (value: string) => void;
  onHeightChange: (value: string) => void;
  onLockAspectChange: (value: boolean) => void;
  onApply: () => void;
  applying: boolean;
  canApply: boolean;
};

export function MediaEditorResizePanel({
  expanded,
  onToggle,
  width,
  height,
  lockAspect,
  onWidthChange,
  onHeightChange,
  onLockAspectChange,
  onApply,
  applying,
  canApply,
}: MediaEditorResizePanelProps) {
  return (
    <div className={editorPanelClass}>
      <button type="button" onClick={onToggle} className={editorPanelToggleClass}>
        <span className="flex items-center gap-2">
          <Maximize2 className="h-4 w-4 text-muted-foreground" />
          Resize
        </span>
        <ChevronDown
          className={cn('h-4 w-4 text-muted-foreground transition-transform', expanded && 'rotate-180')}
        />
      </button>

      {expanded && (
        <div className={editorPanelBodyClass}>
          <div className="flex items-end gap-2">
            <div className="flex-1 space-y-1.5">
              <label htmlFor="resize-w" className="text-xs text-muted-foreground">
                W
              </label>
              <div className="relative">
                <input
                  id="resize-w"
                  type="number"
                  min={1}
                  max={8192}
                  value={width}
                  onChange={(e) => onWidthChange(e.target.value)}
                  className={cn(editorInputClass, 'pr-8')}
                />
                <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-muted-foreground">
                  px
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onLockAspectChange(!lockAspect)}
              className={cn(editorToggleButtonClass(false), 'mb-0.5 h-9 w-9 flex-none')}
              aria-label={lockAspect ? 'Unlock aspect ratio' : 'Lock aspect ratio'}
            >
              {lockAspect ? <Link2 className="h-4 w-4" /> : <Unlink2 className="h-4 w-4" />}
            </button>

            <div className="flex-1 space-y-1.5">
              <label htmlFor="resize-h" className="text-xs text-muted-foreground">
                H
              </label>
              <div className="relative">
                <input
                  id="resize-h"
                  type="number"
                  min={1}
                  max={8192}
                  value={height}
                  onChange={(e) => onHeightChange(e.target.value)}
                  className={cn(editorInputClass, 'pr-8')}
                />
                <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-muted-foreground">
                  px
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            disabled={!canApply || applying}
            onClick={onApply}
            className={editorApplyButtonClass}
          >
            {applying ? 'Applying…' : 'Apply'}
          </button>
        </div>
      )}
    </div>
  );
}

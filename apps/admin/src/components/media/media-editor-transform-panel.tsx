'use client';

import { cn } from '@zodyk/shared-ui';
import {
  ChevronDown,
  FlipHorizontal,
  FlipVertical,
  RotateCcw,
  RotateCw,
  SlidersHorizontal,
} from 'lucide-react';
import {
  editorApplyButtonClass,
  editorPanelBodyClass,
  editorPanelClass,
  editorPanelToggleClass,
  editorToggleButtonClass,
} from './media-editor-classes';

type MediaEditorTransformPanelProps = {
  expanded: boolean;
  onToggle: () => void;
  flipHorizontal: boolean;
  flipVertical: boolean;
  onFlipHorizontal: () => void;
  onFlipVertical: () => void;
  onRotateLeft: () => void;
  onRotateRight: () => void;
  onApply: () => void;
  applying: boolean;
  canApply: boolean;
};

export function MediaEditorTransformPanel({
  expanded,
  onToggle,
  flipHorizontal,
  flipVertical,
  onFlipHorizontal,
  onFlipVertical,
  onRotateLeft,
  onRotateRight,
  onApply,
  applying,
  canApply,
}: MediaEditorTransformPanelProps) {
  return (
    <div className={editorPanelClass}>
      <button type="button" onClick={onToggle} className={editorPanelToggleClass}>
        <span className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
          Transform
        </span>
        <ChevronDown
          className={cn('h-4 w-4 text-muted-foreground transition-transform', expanded && 'rotate-180')}
        />
      </button>

      {expanded && (
        <div className={editorPanelBodyClass}>
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Flip</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onFlipHorizontal}
                className={editorToggleButtonClass(flipHorizontal)}
                aria-label="Flip horizontal"
                aria-pressed={flipHorizontal}
              >
                <FlipHorizontal className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={onFlipVertical}
                className={editorToggleButtonClass(flipVertical)}
                aria-label="Flip vertical"
                aria-pressed={flipVertical}
              >
                <FlipVertical className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Rotate</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onRotateLeft}
                className={editorToggleButtonClass(false)}
                aria-label="Rotate left 90 degrees"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={onRotateRight}
                className={editorToggleButtonClass(false)}
                aria-label="Rotate right 90 degrees"
              >
                <RotateCw className="h-4 w-4" />
              </button>
            </div>
          </div>

          <button
            type="button"
            disabled={!canApply || applying}
            onClick={onApply}
            className={editorApplyButtonClass}
          >
            {applying ? 'Updating…' : 'Apply'}
          </button>
        </div>
      )}
    </div>
  );
}

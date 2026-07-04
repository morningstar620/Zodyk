'use client';

import { cn } from '@zodyk/shared-ui';
import { ChevronDown, Crop, RectangleHorizontal, RectangleVertical } from 'lucide-react';
import {
  editorApplyButtonClass,
  editorListItemClass,
  editorOptionButtonClass,
  editorPanelBodyClass,
  editorPanelClass,
  editorPanelToggleClass,
} from './media-editor-classes';
import {
  LANDSCAPE_RATIOS,
  PORTRAIT_RATIOS,
  type AspectPreset,
  type Orientation,
} from './media-editor-utils';

type MediaEditorCropPanelProps = {
  expanded: boolean;
  onToggle: () => void;
  orientation: Orientation;
  onOrientationChange: (value: Orientation) => void;
  aspectPreset: AspectPreset;
  onAspectPresetChange: (value: AspectPreset) => void;
  onApply: () => void;
  applying: boolean;
  canApply: boolean;
};

function RatioIcon({ preset, orientation }: { preset: AspectPreset; orientation: Orientation }) {
  const isPortrait = orientation === 'portrait';
  const base = 'rounded-sm border border-current opacity-70';

  if (preset === 'freeform') {
    return (
      <span className="relative flex h-4 w-4 items-center justify-center">
        <span className={`${base} h-3 w-3`} />
        <span className="absolute top-0 left-0 h-1 w-1 rounded-full bg-current" />
        <span className="absolute right-0 bottom-0 h-1 w-1 rounded-full bg-current" />
      </span>
    );
  }

  if (preset === 'square') {
    return <span className={`${base} h-3.5 w-3.5`} />;
  }

  const landscape = preset === 'original' || !isPortrait;
  return (
    <span
      className={cn(
        base,
        landscape ? 'h-2.5 w-4' : 'h-4 w-2.5',
      )}
    />
  );
}

export function MediaEditorCropPanel({
  expanded,
  onToggle,
  orientation,
  onOrientationChange,
  aspectPreset,
  onAspectPresetChange,
  onApply,
  applying,
  canApply,
}: MediaEditorCropPanelProps) {
  const ratios = orientation === 'landscape' ? LANDSCAPE_RATIOS : PORTRAIT_RATIOS;

  return (
    <div className={editorPanelClass}>
      <button type="button" onClick={onToggle} className={editorPanelToggleClass}>
        <span className="flex items-center gap-2">
          <Crop className="h-4 w-4 text-muted-foreground" />
          Crop
        </span>
        <ChevronDown
          className={cn('h-4 w-4 text-muted-foreground transition-transform', expanded && 'rotate-180')}
        />
      </button>

      {expanded && (
        <div className={editorPanelBodyClass}>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => onOrientationChange('landscape')}
              className={editorOptionButtonClass(orientation === 'landscape')}
            >
              <RectangleHorizontal className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => onOrientationChange('portrait')}
              className={editorOptionButtonClass(orientation === 'portrait')}
            >
              <RectangleVertical className="h-4 w-4" />
            </button>
          </div>

          <ul className="space-y-0.5">
            {ratios.map(({ id, label }) => (
              <li key={id}>
                <button
                  type="button"
                  onClick={() => onAspectPresetChange(id)}
                  className={editorListItemClass(aspectPreset === id)}
                >
                  <RatioIcon preset={id} orientation={orientation} />
                  <span className="flex-1 text-left">{label}</span>
                  {aspectPreset === id && (
                    <span className="text-muted-foreground">✓</span>
                  )}
                </button>
              </li>
            ))}
          </ul>

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

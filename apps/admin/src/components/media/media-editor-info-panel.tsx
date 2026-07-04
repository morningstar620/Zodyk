'use client';

import type { MediaAsset } from '@zodyk/core';
import { cn } from '@zodyk/shared-ui';
import { ChevronDown, Info } from 'lucide-react';
import {
  editorInputClass,
  editorPanelBodyClass,
  editorPanelClass,
  editorPanelToggleClass,
} from './media-editor-classes';
import {
  formatDate,
  formatFileSize,
  formatMimeLabel,
} from './media-editor-utils';

type MediaEditorInfoPanelProps = {
  asset: MediaAsset;
  name: string;
  alt: string;
  expanded: boolean;
  onToggle: () => void;
  onNameChange: (value: string) => void;
  onAltChange: (value: string) => void;
};

export function MediaEditorInfoPanel({
  asset,
  name,
  alt,
  expanded,
  onToggle,
  onNameChange,
  onAltChange,
}: MediaEditorInfoPanelProps) {
  const dims =
    asset.width && asset.height ? `${asset.width} × ${asset.height}` : null;

  return (
    <div className={editorPanelClass}>
      <button type="button" onClick={onToggle} className={editorPanelToggleClass}>
        <span className="flex items-center gap-2">
          <Info className="h-4 w-4 text-muted-foreground" />
          Information
        </span>
        <ChevronDown
          className={cn('h-4 w-4 text-muted-foreground transition-transform', expanded && 'rotate-180')}
        />
      </button>
      {expanded && (
        <div className={editorPanelBodyClass}>
          <div className="space-y-1.5">
            <label htmlFor="editor-name" className="text-xs text-muted-foreground">
              Name
            </label>
            <input
              id="editor-name"
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder={asset.originalFilename.replace(/\.[^.]+$/, '') || 'Untitled'}
              className={editorInputClass}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="editor-alt" className="text-xs text-muted-foreground">
              Alt text
            </label>
            <input
              id="editor-alt"
              value={alt}
              onChange={(e) => onAltChange(e.target.value)}
              placeholder="Describe this image"
              className={editorInputClass}
            />
          </div>
          <div className="space-y-1 text-xs text-muted-foreground">
            <p className="font-medium text-foreground">Details</p>
            <p>
              {formatMimeLabel(asset.mimeType)}
              {dims ? ` • ${dims}` : ''} • {formatFileSize(asset.size)}
            </p>
            <p>Added {formatDate(asset.createdAt)}</p>
          </div>
        </div>
      )}
    </div>
  );
}

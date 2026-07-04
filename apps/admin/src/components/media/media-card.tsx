'use client';

import type { MediaAsset } from '@zodyk/core';
import { Badge, cn } from '@zodyk/shared-ui';
import { FileImage, Film } from 'lucide-react';
import { MediaActionsMenu } from './media-actions-menu';

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getMediaType(mimeType: string): string {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  return 'file';
}

type MediaCardProps = {
  item: MediaAsset;
  selected: boolean;
  showSelection?: boolean;
  isTrash?: boolean;
  onToggleSelect?: (id: string) => void;
  onOpen: (item: MediaAsset) => void;
  onEdit: (item: MediaAsset) => void;
  onCopyUrl: (item: MediaAsset) => void;
  onDownload: (item: MediaAsset) => void;
  onDelete: (item: MediaAsset) => void;
  onRestore?: (item: MediaAsset) => void;
};

export function MediaCard({
  item,
  selected,
  showSelection,
  isTrash,
  onToggleSelect,
  onOpen,
  onEdit,
  onCopyUrl,
  onDownload,
  onDelete,
  onRestore,
}: MediaCardProps) {
  const isImage = item.mimeType.startsWith('image/');
  const isVideo = item.mimeType.startsWith('video/');
  const mediaType = getMediaType(item.mimeType);
  const canEdit = isImage && !item.mimeType.includes('svg') && !isTrash;

  const dimensions =
    item.width && item.height ? `${item.width} × ${item.height}` : null;

  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-xl border bg-card transition-shadow hover:shadow-md',
        selected ? 'border-primary ring-2 ring-primary' : 'border-border',
      )}
    >
      {showSelection && onToggleSelect && (
        <div
          className="absolute left-2 top-2 z-10"
          onClick={(e) => e.stopPropagation()}
        >
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onToggleSelect(item.id)}
            aria-label={`Select ${item.originalFilename}`}
            className="h-4 w-4 rounded border-border bg-card"
          />
        </div>
      )}

      <div className="absolute top-2 right-2 z-10 opacity-0 transition-opacity group-hover:opacity-100">
        <MediaActionsMenu
          canEdit={canEdit}
          isTrash={isTrash}
          onAction={(action) => {
            if (action === 'edit') onEdit(item);
            else if (action === 'copy') onCopyUrl(item);
            else if (action === 'download') onDownload(item);
            else if (action === 'restore') onRestore?.(item);
            else if (action === 'delete') onDelete(item);
          }}
        />
      </div>

      <button type="button" className="block w-full cursor-pointer text-left" onClick={() => onOpen(item)}>
        <div className="relative flex aspect-[4/3] items-center justify-center bg-gradient-to-br from-muted to-muted/50">
          <Badge
            variant="secondary"
            className="absolute top-2 left-2 bg-card/80 text-xs backdrop-blur"
          >
            {mediaType}
          </Badge>
          {isImage ? (
            <img
              src={item.variantUrls?.webp ?? item.url}
              alt={item.metadata.alt ?? item.originalFilename}
              className="h-full w-full object-cover"
            />
          ) : isVideo ? (
            <Film className="h-10 w-10 text-muted-foreground" />
          ) : (
            <FileImage className="h-10 w-10 text-muted-foreground" />
          )}
        </div>
        <div className="space-y-1 p-3">
          <p className="truncate text-sm font-medium text-foreground">
            {item.originalFilename}
          </p>
          <p className="text-xs text-muted-foreground">
            {dimensions ? `${dimensions} • ` : ''}
            {formatSize(item.size)}
          </p>
        </div>
      </button>
    </div>
  );
}

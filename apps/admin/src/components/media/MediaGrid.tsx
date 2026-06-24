'use client';

import type { MediaAsset } from '@zodyk/core';
import { Badge, cn } from '@zodyk/shared-ui';

interface MediaGridProps {
  items: MediaAsset[];
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  onOpen: (item: MediaAsset) => void;
  selectionMode?: boolean;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function MediaGrid({
  items,
  selectedIds,
  onToggleSelect,
  onOpen,
  selectionMode = true,
}: MediaGridProps) {
  if (items.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded-lg border border-zinc-200 text-sm text-zinc-500">
        No media in this folder
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {items.map((item) => {
        const isImage = item.mimeType.startsWith('image/');
        const selected = selectedIds.includes(item.id);
        return (
          <div
            key={item.id}
            className={cn(
              'group relative overflow-hidden rounded-lg border bg-white',
              selected ? 'border-zinc-900 ring-2 ring-zinc-900' : 'border-zinc-200',
            )}
          >
            {selectionMode && (
              <button
                type="button"
                className="absolute left-2 top-2 z-10 rounded bg-white/90 px-2 py-1 text-xs shadow"
                onClick={() => onToggleSelect(item.id)}
              >
                {selected ? 'Selected' : 'Select'}
              </button>
            )}
            <button type="button" className="block w-full text-left" onClick={() => onOpen(item)}>
              <div className="flex aspect-square items-center justify-center bg-zinc-100">
                {isImage ? (
                  <img
                    src={item.variantUrls?.webp ?? item.url}
                    alt={item.metadata.alt ?? item.originalFilename}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-xs text-zinc-500">{item.mimeType}</span>
                )}
              </div>
              <div className="space-y-1 p-2">
                <p className="truncate text-sm font-medium text-zinc-900">
                  {item.originalFilename}
                </p>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{formatSize(item.size)}</Badge>
                  {item.variants.length > 0 && <Badge variant="secondary">Optimized</Badge>}
                </div>
              </div>
            </button>
          </div>
        );
      })}
    </div>
  );
}

'use client';

import type { MediaAsset } from '@zodyk/core';
import { cn } from '@zodyk/shared-ui';

interface FolderTreeProps {
  folders: string[];
  selected: string;
  onSelect: (folder: string) => void;
  className?: string;
}

export function FolderTree({ folders, selected, onSelect, className }: FolderTreeProps) {
  return (
    <nav className={cn('flex flex-col gap-1', className)}>
      {folders.map((folder) => (
        <button
          key={folder}
          type="button"
          onClick={() => onSelect(folder)}
          className={cn(
            'rounded-md px-3 py-2 text-left text-sm',
            selected === folder
              ? 'bg-zinc-900 text-white'
              : 'text-zinc-700 hover:bg-zinc-100',
          )}
        >
          {folder === '/' ? 'All files' : folder}
        </button>
      ))}
    </nav>
  );
}

export type { MediaAsset };

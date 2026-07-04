'use client';

import { Card, CardContent, CardHeader, CardTitle, cn } from '@zodyk/shared-ui';
import { MEDIA_TRASH_FOLDER } from '@zodyk/core';
import { Folder, Trash2 } from 'lucide-react';

export type MediaFolder = {
  folder: string;
  count: number;
};

type MediaFoldersSidebarProps = {
  folders: MediaFolder[];
  selected: string;
  onSelect: (folder: string) => void;
};

function folderLabel(folder: string): string {
  if (folder === '/') return 'All files';
  if (folder === MEDIA_TRASH_FOLDER) return 'Trash';
  return folder.replace(/^\//, '');
}

export function MediaFoldersSidebar({ folders, selected, onSelect }: MediaFoldersSidebarProps) {
  const regularFolders = folders.filter((f) => f.folder !== MEDIA_TRASH_FOLDER);
  const trashFolder = folders.find((f) => f.folder === MEDIA_TRASH_FOLDER);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">Folders</CardTitle>
      </CardHeader>
      <CardContent className="space-y-0.5 p-2 pt-0">
        {regularFolders.map(({ folder, count }) => (
          <button
            key={folder}
            type="button"
            onClick={() => onSelect(folder)}
            className={cn(
              'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors',
              selected === folder
                ? 'bg-primary/10 text-primary'
                : 'text-foreground hover:bg-muted',
            )}
          >
            <Folder className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="min-w-0 flex-1 truncate">{folderLabel(folder)}</span>
            <span className="shrink-0 text-xs text-muted-foreground">{count}</span>
          </button>
        ))}

        {trashFolder && (
          <>
            <div className="my-2 border-t border-border" />
            <button
              type="button"
              onClick={() => onSelect(MEDIA_TRASH_FOLDER)}
              className={cn(
                'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors',
                selected === MEDIA_TRASH_FOLDER
                  ? 'bg-destructive/10 text-destructive'
                  : 'text-foreground hover:bg-muted',
              )}
            >
              <Trash2 className="h-4 w-4 shrink-0" />
              <span className="min-w-0 flex-1 truncate">Trash</span>
              <span className="shrink-0 text-xs text-muted-foreground">{trashFolder.count}</span>
            </button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

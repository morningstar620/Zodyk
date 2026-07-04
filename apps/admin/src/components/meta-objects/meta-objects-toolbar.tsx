'use client';

import { Grid3X3, List, Plus, Search } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@zodyk/shared-ui';

type ViewMode = 'grid' | 'list';

type MetaObjectsToolbarProps = {
  search: string;
  onSearchChange: (value: string) => void;
  view: ViewMode;
  onViewChange: (view: ViewMode) => void;
};

export function MetaObjectsToolbar({
  search,
  onSearchChange,
  view,
  onViewChange,
}: MetaObjectsToolbarProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="relative max-w-md flex-1">
        <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search objects..."
          className="h-10 w-full rounded-lg border border-border bg-card pl-9 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
        />
      </div>
      <div className="flex items-center gap-2">
        <div className="flex rounded-lg border border-border p-0.5">
          <button
            type="button"
            onClick={() => onViewChange('grid')}
            className={cn(
              'inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors',
              view === 'grid'
                ? 'bg-muted text-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
            aria-label="Grid view"
          >
            <Grid3X3 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onViewChange('list')}
            className={cn(
              'inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors',
              view === 'list'
                ? 'bg-muted text-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
            aria-label="List view"
          >
            <List className="h-4 w-4" />
          </button>
        </div>
        <Link
          href="/meta-objects/new"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          New object
        </Link>
      </div>
    </div>
  );
}

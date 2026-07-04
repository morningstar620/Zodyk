'use client';

import { Button } from '@zodyk/shared-ui';
import { LayoutGrid, List, Plus } from 'lucide-react';
import Link from 'next/link';

type ViewMode = 'grid' | 'list';

type EntitiesToolbarProps = {
  search: string;
  onSearchChange: (value: string) => void;
  view: ViewMode;
  onViewChange: (view: ViewMode) => void;
};

export function EntitiesToolbar({
  search,
  onSearchChange,
  view,
  onViewChange,
}: EntitiesToolbarProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <input
        type="search"
        placeholder="Search system entities…"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        className="h-10 w-full max-w-sm rounded-md border border-border bg-background px-3 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring sm:w-72"
      />
      <div className="flex items-center gap-2">
        <div className="flex rounded-md border border-border">
          <button
            type="button"
            onClick={() => onViewChange('grid')}
            className={`inline-flex h-9 w-9 items-center justify-center ${view === 'grid' ? 'bg-muted' : ''}`}
            aria-label="Grid view"
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onViewChange('list')}
            className={`inline-flex h-9 w-9 items-center justify-center ${view === 'list' ? 'bg-muted' : ''}`}
            aria-label="List view"
          >
            <List className="h-4 w-4" />
          </button>
        </div>
        <Link href="/system-entities/new">
          <Button>
            <Plus className="h-4 w-4" />
            New entity
          </Button>
        </Link>
      </div>
    </div>
  );
}

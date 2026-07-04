'use client';

import { cn } from '@zodyk/shared-ui';
import { Grid3X3, List, Search } from 'lucide-react';

export type MediaViewMode = 'grid' | 'list';
export type MediaTypeFilter = 'all' | 'image' | 'video' | 'document';

type MediaToolbarProps = {
  search: string;
  onSearchChange: (value: string) => void;
  typeFilter: MediaTypeFilter;
  onTypeFilterChange: (value: MediaTypeFilter) => void;
  view: MediaViewMode;
  onViewChange: (view: MediaViewMode) => void;
  showSelection?: boolean;
  allPageSelected?: boolean;
  selectedCount?: number;
  onToggleSelectAll?: () => void;
};

const TYPE_OPTIONS: { value: MediaTypeFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'image', label: 'Images' },
  { value: 'video', label: 'Video' },
  { value: 'document', label: 'Documents' },
];

export function MediaToolbar({
  search,
  onSearchChange,
  typeFilter,
  onTypeFilterChange,
  view,
  onViewChange,
  showSelection,
  allPageSelected,
  selectedCount = 0,
  onToggleSelectAll,
}: MediaToolbarProps) {
  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search assets..."
            className="h-10 w-full rounded-lg border border-border bg-card pl-9 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
          <select
            value={typeFilter}
            onChange={(e) => onTypeFilterChange(e.target.value as MediaTypeFilter)}
            className="h-10 rounded-lg border border-border bg-card px-3 text-sm text-foreground focus:border-primary focus:outline-none"
          >
            {TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                Type: {opt.label}
              </option>
            ))}
          </select>
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
              aria-pressed={view === 'grid'}
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
              aria-pressed={view === 'list'}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {showSelection && (
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={Boolean(allPageSelected)}
            onChange={() => onToggleSelectAll?.()}
            className="rounded border-border"
          />
          <span>
            Select all on this page
            {selectedCount > 0 ? ` · ${selectedCount} selected` : ''}
          </span>
        </label>
      )}
    </div>
  );
}

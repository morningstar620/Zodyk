'use client';

import { Badge, Button, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@zodyk/shared-ui';
import { Plus, Search } from 'lucide-react';
import Link from 'next/link';

export type EntryRow = {
  id: string;
  status: string;
  data: Record<string, unknown>;
  handle?: string;
  updatedAt: string;
};

type EntriesTableProps = {
  slug: string;
  entries: EntryRow[];
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
};

export function entryLabel(data: Record<string, unknown>): string {
  const candidate = data.title ?? data.name ?? data.quote;
  return typeof candidate === 'string' ? candidate : 'Untitled entry';
}

export function EntriesToolbar({
  slug,
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
}: Pick<EntriesTableProps, 'slug' | 'search' | 'onSearchChange' | 'statusFilter' | 'onStatusFilterChange'>) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="relative max-w-md flex-1">
        <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search entries..."
          className="h-10 w-full rounded-lg border border-border bg-card pl-9 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
        />
      </div>
      <div className="flex items-center gap-2">
        <select
          value={statusFilter}
          onChange={(e) => onStatusFilterChange(e.target.value)}
          className="h-10 rounded-lg border border-border bg-card px-3 text-sm text-foreground"
        >
          <option value="">All statuses</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
          <option value="scheduled">Scheduled</option>
          <option value="archived">Archived</option>
        </select>
        <Link
          href={`/meta-objects/${slug}/entries/new`}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          New entry
        </Link>
      </div>
    </div>
  );
}

export function EntriesTable({ slug, entries }: Pick<EntriesTableProps, 'slug' | 'entries'>) {
  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Updated</TableHead>
            <TableHead className="w-20" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                No entries found. Create your first entry to get started.
              </TableCell>
            </TableRow>
          ) : (
            entries.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell>
                  <Link
                    href={`/meta-objects/${slug}/entries/${entry.id}`}
                    className="font-medium text-foreground hover:text-primary"
                  >
                    {entryLabel(entry.data)}
                  </Link>
                  {entry.handle && (
                    <p className="text-xs text-muted-foreground">/{entry.handle}</p>
                  )}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      entry.status === 'published'
                        ? 'success'
                        : entry.status === 'draft'
                          ? 'secondary'
                          : 'outline'
                    }
                  >
                    {entry.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {new Date(entry.updatedAt).toLocaleString()}
                </TableCell>
                <TableCell>
                  <Link href={`/meta-objects/${slug}/entries/${entry.id}`}>
                    <Button variant="ghost" size="sm">
                      Edit
                    </Button>
                  </Link>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

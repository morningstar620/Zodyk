'use client';

import type { MetaFieldDefinition } from '@zodyk/core';
import { generateRecordLabel } from '@zodyk/core';
import {
  Badge,
  Button,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@zodyk/shared-ui';
import { LayoutGrid, List, Plus, Table2 } from 'lucide-react';
import Link from 'next/link';
import { useMemo } from 'react';
import type { SystemRecordRow } from './system-entity-types';

export function recordLabel(data: Record<string, unknown>): string {
  return generateRecordLabel(data);
}

type ViewMode = 'table' | 'list' | 'card';

type RecordsToolbarProps = {
  slug: string;
  singularLabel: string;
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  view: ViewMode;
  onViewChange: (view: ViewMode) => void;
};

export function RecordsToolbar({
  slug,
  singularLabel,
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  view,
  onViewChange,
}: RecordsToolbarProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-1 flex-wrap gap-2">
        <input
          type="search"
          placeholder="Search records…"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="h-10 w-full max-w-xs rounded-md border border-border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <select
          value={statusFilter}
          onChange={(e) => onStatusFilterChange(e.target.value)}
          className="h-10 rounded-md border border-border bg-background px-3 text-sm"
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="draft">Draft</option>
          <option value="archived">Archived</option>
        </select>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex rounded-md border border-border">
          {([
            ['table', Table2],
            ['list', List],
            ['card', LayoutGrid],
          ] as const).map(([mode, Icon]) => (
            <button
              key={mode}
              type="button"
              onClick={() => onViewChange(mode)}
              className={`inline-flex h-9 w-9 items-center justify-center ${view === mode ? 'bg-muted' : ''}`}
              aria-label={`${mode} view`}
            >
              <Icon className="h-4 w-4" />
            </button>
          ))}
        </div>
        <Link href={`/system-entities/${slug}/records/new`}>
          <Button>
            <Plus className="h-4 w-4" />
            New {singularLabel.toLowerCase()}
          </Button>
        </Link>
      </div>
    </div>
  );
}

type RecordsViewProps = {
  slug: string;
  records: SystemRecordRow[];
  fields: MetaFieldDefinition[];
  displayColumns: string[];
  view: ViewMode;
  visibleColumns: string[];
  onToggleColumn: (key: string) => void;
  sortField: string;
  onSortChange: (field: string) => void;
};

export function RecordsView({
  slug,
  records,
  fields,
  displayColumns,
  view,
  visibleColumns,
  onToggleColumn,
  sortField,
  onSortChange,
}: RecordsViewProps) {
  const columnFields = useMemo(() => {
    const userFields = fields.filter((f) => !f.isSystem && !f.hidden);
    const configured = displayColumns.length > 0 ? displayColumns : userFields.slice(0, 4).map((f) => f.key);
    return configured
      .map((key) => userFields.find((f) => f.key === key))
      .filter(Boolean) as MetaFieldDefinition[];
  }, [fields, displayColumns]);

  const effectiveColumns = columnFields.filter((f) => visibleColumns.includes(f.key));

  if (view === 'card') {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {records.map((record) => (
          <Link key={record.id} href={`/system-entities/${slug}/records/${record.id}`}>
            <Card className="transition-colors hover:border-primary/40">
              <CardContent className="p-4">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="font-medium">{recordLabel(record.data)}</h3>
                  <Badge variant={record.status === 'active' ? 'success' : 'secondary'}>
                    {record.status}
                  </Badge>
                </div>
                {effectiveColumns.slice(0, 2).map((col) => (
                  <p key={col.key} className="text-xs text-muted-foreground">
                    {col.label}: {String(record.data[col.key] ?? '—')}
                  </p>
                ))}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    );
  }

  if (view === 'list') {
    return (
      <ul className="divide-y divide-border rounded-xl border border-border">
        {records.map((record) => (
          <li key={record.id}>
            <Link
              href={`/system-entities/${slug}/records/${record.id}`}
              className="flex items-center justify-between px-4 py-3 hover:bg-muted/30"
            >
              <div>
                <p className="font-medium">{recordLabel(record.data)}</p>
                <p className="text-xs text-muted-foreground">
                  Updated {new Date(record.updatedAt).toLocaleString()}
                </p>
              </div>
              <Badge variant={record.status === 'active' ? 'success' : 'secondary'}>
                {record.status}
              </Badge>
            </Link>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {columnFields.map((col) => (
          <button
            key={col.key}
            type="button"
            onClick={() => onToggleColumn(col.key)}
            className={`rounded-full border px-2 py-1 text-xs ${
              visibleColumns.includes(col.key) ? 'border-primary bg-primary/10' : 'border-border'
            }`}
          >
            {col.label}
          </button>
        ))}
      </div>
      <div className="overflow-hidden rounded-xl border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <button type="button" onClick={() => onSortChange('title')}>
                  Title {sortField === 'title' ? '↑' : ''}
                </button>
              </TableHead>
              {effectiveColumns.map((col) => (
                <TableHead key={col.key}>
                  <button type="button" onClick={() => onSortChange(col.key)}>
                    {col.label} {sortField === col.key ? '↑' : ''}
                  </button>
                </TableHead>
              ))}
              <TableHead>Status</TableHead>
              <TableHead>Updated</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.map((record) => (
              <TableRow key={record.id}>
                <TableCell className="font-medium">{recordLabel(record.data)}</TableCell>
                {effectiveColumns.map((col) => (
                  <TableCell key={col.key}>{String(record.data[col.key] ?? '—')}</TableCell>
                ))}
                <TableCell>
                  <Badge variant={record.status === 'active' ? 'success' : 'secondary'}>
                    {record.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {new Date(record.updatedAt).toLocaleString()}
                </TableCell>
                <TableCell>
                  <Link
                    href={`/system-entities/${slug}/records/${record.id}`}
                    className="text-sm text-primary hover:underline"
                  >
                    Edit
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

'use client';

import { Badge, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@zodyk/shared-ui';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { PageBreadcrumbs } from '@/components/meta-objects/page-breadcrumbs';
import { EntityCard } from '@/components/system-entities/entity-card';
import { EntitiesToolbar } from '@/components/system-entities/entities-toolbar';
import { fetchSystemRecords } from '@/components/system-entities/system-entities-api';
import type { SystemEntityRow } from '@/components/system-entities/system-entity-types';
import { TableSkeleton } from '@/components/skeletons';
import { useApi } from '@/hooks/use-api';

type ViewMode = 'grid' | 'list';

export default function SystemEntitiesPage() {
  const { data: items = [], isLoading } = useApi<SystemEntityRow[]>('/api/v1/system-entities');
  const [search, setSearch] = useState('');
  const [view, setView] = useState<ViewMode>('grid');
  const [recordCounts, setRecordCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    if (items.length === 0) return;

    Promise.all(
      items.map(async (item) => {
        try {
          const result = await fetchSystemRecords(item.slug, { limit: '1' });
          return [item.slug, result.pagination.total] as const;
        } catch {
          return [item.slug, 0] as const;
        }
      }),
    ).then((pairs) => setRecordCounts(Object.fromEntries(pairs)));
  }, [items]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return items;
    return items.filter(
      (item) =>
        item.name.toLowerCase().includes(query) ||
        item.slug.toLowerCase().includes(query) ||
        item.description?.toLowerCase().includes(query) ||
        item.systemCategory?.toLowerCase().includes(query),
    );
  }, [items, search]);

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <div>
        <PageBreadcrumbs
          items={[
            { label: 'Administration', href: '/system-entities' },
            { label: 'System Entities' },
          ]}
          className="mb-2"
        />
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">System Entities</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Operational entities that integrate with platform features — create entirely from the UI.
        </p>
      </div>

      <EntitiesToolbar
        search={search}
        onSearchChange={setSearch}
        view={view}
        onViewChange={setView}
      />

      {isLoading && items.length === 0 ? (
        view === 'grid' ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-40 animate-pulse rounded-xl border border-border bg-muted/30" />
            ))}
          </div>
        ) : (
          <TableSkeleton rows={5} columns={6} />
        )
      ) : view === 'grid' ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((item) => (
            <EntityCard
              key={item.id}
              name={item.name}
              slug={item.slug}
              description={item.description}
              icon={item.icon}
              color={item.color}
              fieldCount={item.fields?.length ?? 0}
              recordCount={recordCounts[item.slug] ?? 0}
              enabled={item.enabled}
              systemCategory={item.systemCategory}
            />
          ))}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Records</TableHead>
                <TableHead>Fields</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <Link
                      href={`/system-entities/${item.slug}`}
                      className="font-medium text-foreground hover:text-primary"
                    >
                      {item.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{item.slug}</TableCell>
                  <TableCell>{item.systemCategory ?? '—'}</TableCell>
                  <TableCell>{recordCounts[item.slug] ?? '—'}</TableCell>
                  <TableCell>{item.fields?.length ?? 0}</TableCell>
                  <TableCell>
                    <Badge variant={item.enabled ? 'success' : 'secondary'}>
                      {item.enabled ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {!isLoading && filtered.length === 0 && (
        <div className="rounded-xl border border-dashed border-border py-16 text-center">
          <p className="text-muted-foreground">No system entities yet. Create your first entity to get started.</p>
        </div>
      )}
    </div>
  );
}

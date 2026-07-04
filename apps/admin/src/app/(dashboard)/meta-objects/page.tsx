'use client';

import { Badge, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@zodyk/shared-ui';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { MetaObjectCard } from '@/components/meta-objects/meta-object-card';
import { MetaObjectsToolbar } from '@/components/meta-objects/meta-objects-toolbar';
import { PageBreadcrumbs } from '@/components/meta-objects/page-breadcrumbs';
import { TableSkeleton } from '@/components/skeletons';
import { useApi } from '@/hooks/use-api';

interface MetaObjectRow {
  id: string;
  name: string;
  slug: string;
  description?: string;
  status: string;
  fields: { key: string }[];
}

type ViewMode = 'grid' | 'list';

async function fetchEntryCount(slug: string): Promise<number> {
  const res = await fetch(`/api/v1/meta-objects/${slug}/entries?limit=1`);
  if (!res.ok) return 0;
  const json = await res.json();
  return json.pagination?.total ?? 0;
}

export default function MetaObjectsPage() {
  const { data: items = [], isLoading } = useApi<MetaObjectRow[]>('/api/v1/meta-objects');
  const [search, setSearch] = useState('');
  const [view, setView] = useState<ViewMode>('grid');
  const [entryCounts, setEntryCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    if (items.length === 0) return;

    Promise.all(
      items.map(async (item) => {
        const count = await fetchEntryCount(item.slug);
        return [item.slug, count] as const;
      }),
    ).then((pairs) => {
      setEntryCounts(Object.fromEntries(pairs));
    });
  }, [items]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return items;
    return items.filter(
      (item) =>
        item.name.toLowerCase().includes(query) ||
        item.slug.toLowerCase().includes(query) ||
        item.description?.toLowerCase().includes(query),
    );
  }, [items, search]);

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <div>
        <PageBreadcrumbs
          items={[{ label: 'Content', href: '/meta-objects' }, { label: 'Meta Objects' }]}
          className="mb-2"
        />
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Meta Objects</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Structured content types — define schemas once, reuse anywhere.
        </p>
      </div>

      <MetaObjectsToolbar
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
          <TableSkeleton rows={5} columns={5} />
        )
      ) : view === 'grid' ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((item) => (
            <MetaObjectCard
              key={item.id}
              name={item.name}
              slug={item.slug}
              description={item.description}
              fieldCount={item.fields?.length ?? 0}
              entryCount={entryCounts[item.slug] ?? 0}
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
                <TableHead>Entries</TableHead>
                <TableHead>Fields</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <Link
                      href={`/meta-objects/${item.slug}`}
                      className="font-medium text-foreground hover:text-primary"
                    >
                      {item.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{item.slug}</TableCell>
                  <TableCell>{entryCounts[item.slug] ?? '—'}</TableCell>
                  <TableCell>{item.fields?.length ?? 0}</TableCell>
                  <TableCell>
                    <Badge variant={item.status === 'active' ? 'success' : 'secondary'}>
                      {item.status}
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
          <p className="text-muted-foreground">No meta objects match your search.</p>
        </div>
      )}
    </div>
  );
}

'use client';

import { Button } from '@zodyk/shared-ui';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import {
  EntriesTable,
  EntriesToolbar,
  entryLabel,
  type EntryRow,
} from '@/components/meta-objects/entries-table';
import { PageBreadcrumbs } from '@/components/meta-objects/page-breadcrumbs';
import { TableSkeleton } from '@/components/skeletons';

export default function MetaEntriesPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;

  const [typeName, setTypeName] = useState(slug);
  const [entries, setEntries] = useState<EntryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    const query = new URLSearchParams();
    if (statusFilter) query.set('status', statusFilter);
    if (search.trim()) query.set('search', search.trim());

    setLoading(true);
    Promise.all([
      fetch(`/api/v1/meta-objects/${slug}`).then((r) => r.json()),
      fetch(`/api/v1/meta-objects/${slug}/entries?${query.toString()}`).then((r) => r.json()),
    ])
      .then(([type, result]) => {
        setTypeName(type.name ?? slug);
        setEntries(result.data ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [slug, search, statusFilter]);

  const filteredEntries = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return entries;
    return entries.filter((entry) => entryLabel(entry.data).toLowerCase().includes(query));
  }, [entries, search]);

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <PageBreadcrumbs
            items={[
              { label: 'Content', href: '/meta-objects' },
              { label: 'Meta Objects', href: '/meta-objects' },
              { label: typeName, href: `/meta-objects/${slug}` },
              { label: 'Entries' },
            ]}
            className="mb-2"
          />
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {typeName} entries
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage content entries for this meta object.
          </p>
        </div>
        <Link href={`/meta-objects/${slug}`}>
          <Button variant="outline">Edit schema</Button>
        </Link>
      </div>

      <EntriesToolbar
        slug={slug}
        search={search}
        onSearchChange={setSearch}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
      />

      {loading ? (
        <TableSkeleton rows={6} columns={4} />
      ) : (
        <EntriesTable slug={slug} entries={filteredEntries} />
      )}
    </div>
  );
}

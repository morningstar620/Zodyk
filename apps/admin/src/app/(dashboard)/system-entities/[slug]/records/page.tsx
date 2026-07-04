'use client';

import type { MetaFieldDefinition } from '@zodyk/core';
import { Button } from '@zodyk/shared-ui';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { PageBreadcrumbs } from '@/components/meta-objects/page-breadcrumbs';
import { RecordsToolbar, RecordsView } from '@/components/system-entities/records-table';
import {
  fetchSystemEntity,
  fetchSystemRecords,
} from '@/components/system-entities/system-entities-api';
import type { SystemRecordRow } from '@/components/system-entities/system-entity-types';
import { TableSkeleton } from '@/components/skeletons';

export default function SystemRecordsPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;

  const [entityName, setEntityName] = useState(slug);
  const [singularLabel, setSingularLabel] = useState('Record');
  const [records, setRecords] = useState<SystemRecordRow[]>([]);
  const [fields, setFields] = useState<MetaFieldDefinition[]>([]);
  const [displayColumns, setDisplayColumns] = useState<string[]>([]);
  const [defaultView, setDefaultView] = useState<'table' | 'list' | 'card'>('table');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortField, setSortField] = useState('-createdAt');
  const [view, setView] = useState<'table' | 'list' | 'card'>('table');
  const [visibleColumns, setVisibleColumns] = useState<string[]>([]);

  useEffect(() => {
    const query: Record<string, string> = {};
    if (statusFilter) query.status = statusFilter;
    if (search.trim()) query.search = search.trim();
    if (sortField) query.sort = sortField.startsWith('-') ? sortField : sortField;

    setLoading(true);
    Promise.all([fetchSystemEntity(slug), fetchSystemRecords(slug, query)])
      .then(([entity, result]) => {
        setEntityName(entity.name);
        setSingularLabel(entity.singularLabel);
        setFields(entity.fields ?? []);
        setDisplayColumns(entity.display?.tableColumns ?? []);
        setDefaultView(entity.defaultView);
        setView(entity.defaultView);
        const userFields = (entity.fields ?? []).filter((f) => !f.isSystem && !f.hidden);
        setVisibleColumns(
          entity.display?.tableColumns?.length
            ? entity.display.tableColumns
            : userFields.slice(0, 4).map((f) => f.key),
        );
        setRecords(result.data ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [slug, search, statusFilter, sortField]);

  const toggleColumn = (key: string) => {
    setVisibleColumns((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  };

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <PageBreadcrumbs
            items={[
              { label: 'Administration', href: '/system-entities' },
              { label: 'System Entities', href: '/system-entities' },
              { label: entityName, href: `/system-entities/${slug}` },
              { label: 'Records' },
            ]}
            className="mb-2"
          />
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {entityName} records
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage records for this system entity.
          </p>
        </div>
        <Link href={`/system-entities/${slug}`}>
          <Button variant="outline">Edit entity</Button>
        </Link>
      </div>

      <RecordsToolbar
        slug={slug}
        singularLabel={singularLabel}
        search={search}
        onSearchChange={setSearch}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        view={view}
        onViewChange={setView}
      />

      {loading ? (
        <TableSkeleton rows={6} columns={5} />
      ) : (
        <RecordsView
          slug={slug}
          records={records}
          fields={fields}
          displayColumns={displayColumns}
          view={view}
          visibleColumns={visibleColumns}
          onToggleColumn={toggleColumn}
          sortField={sortField}
          onSortChange={(field) =>
            setSortField((prev) => (prev === field ? `-${field}` : field))
          }
        />
      )}

      {!loading && records.length === 0 && (
        <div className="rounded-xl border border-dashed border-border py-12 text-center text-muted-foreground">
          No records yet.
        </div>
      )}
    </div>
  );
}

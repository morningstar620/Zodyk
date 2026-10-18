'use client';

import {
  Badge,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@zodyk/shared-ui';
import Link from 'next/link';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useApi } from '@/hooks/use-api';
import { TableSkeleton } from '@/components/skeletons';

interface PageRow {
  id: string;
  title: string;
  slug: string;
  path?: string;
  status: string;
  templateSuffix?: string;
}

interface PagesResponse {
  data: PageRow[];
}

const FILTERS = [
  { href: '/pages', label: 'All', status: null },
  { href: '/pages?status=draft', label: 'Drafts', status: 'draft' },
  { href: '/pages?status=scheduled', label: 'Scheduled', status: 'scheduled' },
  { href: '/pages?status=published', label: 'Published', status: 'published' },
  { href: '/pages?status=archived', label: 'Archived', status: 'archived' },
] as const;

function statusVariant(status: string): 'success' | 'secondary' | 'purple' | 'outline' {
  if (status === 'published') return 'success';
  if (status === 'scheduled') return 'purple';
  if (status === 'archived') return 'outline';
  return 'secondary';
}

function PagesList() {
  const searchParams = useSearchParams();
  const status = searchParams.get('status');
  const query = status ? `/api/v1/pages?status=${encodeURIComponent(status)}` : '/api/v1/pages';
  const { data, error, isLoading } = useApi<PagesResponse>(query);
  const items = data?.data ?? [];
  const filter = FILTERS.find((item) => item.status === status);
  const heading = filter && filter.status ? filter.label : 'Pages';

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">{heading}</h1>
          <p className="text-zinc-600">
            {status ? `Showing ${status} pages` : 'Manage CMS pages and template assignments'}
          </p>
        </div>
        <Link href="/pages/new" prefetch>
          <Button>Create page</Button>
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((item) => {
          const active = item.status === status || (!item.status && !status);
          return (
            <Link
              key={item.label}
              href={item.href}
              className={
                active
                  ? 'rounded-md bg-zinc-900 px-3 py-1.5 text-sm text-white'
                  : 'rounded-md border border-zinc-200 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50'
              }
            >
              {item.label}
            </Link>
          );
        })}
      </div>

      {error && !data ? (
        <p className="text-sm text-red-600">
          {error instanceof Error ? error.message : 'Failed to load pages'}
        </p>
      ) : null}

      {isLoading && !data ? (
        <TableSkeleton rows={5} columns={5} />
      ) : (
        <div className="rounded-lg border border-zinc-200">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>URL</TableHead>
                <TableHead>Template</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-zinc-500">
                    No pages in this view.
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.title}</TableCell>
                    <TableCell>{item.path ?? `/${item.slug}`}</TableCell>
                    <TableCell>
                      {item.templateSuffix ? `page.${item.templateSuffix}.json` : 'page.json'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(item.status)}>{item.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/pages/${item.id}`}
                        prefetch
                        className="text-sm text-zinc-600 hover:underline"
                      >
                        Edit
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

export default function PagesListPage() {
  return (
    <Suspense fallback={<TableSkeleton rows={5} columns={5} />}>
      <PagesList />
    </Suspense>
  );
}

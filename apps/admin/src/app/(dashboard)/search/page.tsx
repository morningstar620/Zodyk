'use client';

import { Badge, Card, CardContent, CardHeader, CardTitle } from '@zodyk/shared-ui';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { TableSkeleton } from '@/components/skeletons';
import { useApi } from '@/hooks/use-api';
import { normalizeSearchQuery } from '@/lib/search';

type PageRow = {
  id: string;
  title: string;
  path: string;
  status: string;
};

type UserRow = {
  id: string;
  name: string;
  email: string;
  status: string;
};

type ListResponse<T> = {
  data: T[];
  pagination: { page: number; limit: number; total: number; pages: number };
};

function statusVariant(status: string): 'success' | 'secondary' | 'destructive' {
  if (status === 'published' || status === 'active') return 'success';
  if (status === 'suspended') return 'destructive';
  return 'secondary';
}

function SearchResults() {
  const searchParams = useSearchParams();
  const query = normalizeSearchQuery(searchParams.get('q'));
  const suffix = `limit=10&search=${encodeURIComponent(query)}`;
  const pages = useApi<ListResponse<PageRow>>(query ? `/api/v1/pages?${suffix}` : null);
  const users = useApi<ListResponse<UserRow>>(query ? `/api/v1/users?${suffix}` : null);

  if (!query) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          Enter a search term in the header to find pages and users.
        </CardContent>
      </Card>
    );
  }

  const isLoading = pages.isLoading || users.isLoading;
  const error = pages.error ?? users.error;
  const pageResults = pages.data?.data ?? [];
  const userResults = users.data?.data ?? [];
  const total = pageResults.length + userResults.length;

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-muted-foreground">
        {isLoading
          ? `Searching for “${query}”...`
          : `${total} result${total === 1 ? '' : 's'} for “${query}”`}
      </p>

      {isLoading && <TableSkeleton rows={5} columns={3} />}
      {!isLoading && error && (
        <p className="text-sm text-muted-foreground">Search failed: {error.message}</p>
      )}

      {!isLoading && !error && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Pages</CardTitle>
            </CardHeader>
            <CardContent>
              {pageResults.length === 0 ? (
                <p className="text-sm text-muted-foreground">No matching pages.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {pageResults.map((page) => (
                    <li key={page.id} className="flex items-center justify-between gap-3 py-3">
                      <div className="min-w-0">
                        <Link
                          href={`/pages/${page.id}`}
                          className="truncate font-medium text-foreground hover:underline"
                        >
                          {page.title}
                        </Link>
                        <p className="truncate text-xs text-muted-foreground">{page.path}</p>
                      </div>
                      <Badge variant={statusVariant(page.status)}>{page.status}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Users</CardTitle>
            </CardHeader>
            <CardContent>
              {userResults.length === 0 ? (
                <p className="text-sm text-muted-foreground">No matching users.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {userResults.map((user) => (
                    <li key={user.id} className="flex items-center justify-between gap-3 py-3">
                      <div className="min-w-0">
                        <Link
                          href={`/users/${user.id}`}
                          className="truncate font-medium text-foreground hover:underline"
                        >
                          {user.name}
                        </Link>
                        <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                      </div>
                      <Badge variant={statusVariant(user.status)}>{user.status}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-foreground">Search</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Search pages and users from the admin workspace.
        </p>
      </div>
      <Suspense fallback={<TableSkeleton rows={5} columns={3} />}>
        <SearchResults />
      </Suspense>
    </div>
  );
}

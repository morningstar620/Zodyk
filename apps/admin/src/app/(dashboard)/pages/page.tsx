'use client';

import { Badge, Button, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@zodyk/shared-ui';
import Link from 'next/link';
import { useApi } from '@/hooks/use-api';
import { TableSkeleton } from '@/components/skeletons';

interface PageRow {
  id: string;
  title: string;
  slug: string;
  status: string;
  templateSuffix?: string;
}

interface PagesResponse {
  data: PageRow[];
}

export default function PagesListPage() {
  const { data, isLoading } = useApi<PagesResponse>('/api/v1/pages');
  const items = data?.data ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Pages</h1>
          <p className="text-zinc-600">Manage CMS pages and template assignments</p>
        </div>
        <Link href="/pages/new" prefetch>
          <Button>Create page</Button>
        </Link>
      </div>

      {isLoading && !data ? (
        <TableSkeleton rows={5} columns={5} />
      ) : (
        <div className="rounded-lg border border-zinc-200">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Template</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.title}</TableCell>
                  <TableCell>/{item.slug}</TableCell>
                  <TableCell>
                    {item.templateSuffix ? `page.${item.templateSuffix}.json` : 'page.json'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={item.status === 'published' ? 'success' : 'secondary'}>
                      {item.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Link href={`/pages/${item.id}`} prefetch className="text-sm text-zinc-600 hover:underline">
                      Edit
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

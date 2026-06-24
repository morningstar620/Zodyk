'use client';

import { Badge, Button, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@zodyk/shared-ui';
import Link from 'next/link';
import { useApi } from '@/hooks/use-api';
import { TableSkeleton } from '@/components/skeletons';

interface MetaObjectRow {
  id: string;
  name: string;
  slug: string;
  status: string;
  fields: { key: string }[];
}

export default function MetaObjectsPage() {
  const { data: items = [], isLoading } = useApi<MetaObjectRow[]>('/api/v1/meta-objects');

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Meta Objects</h1>
          <p className="text-zinc-600">Define custom content types and their fields</p>
        </div>
        <Link href="/meta-objects/new" prefetch>
          <Button>Create type</Button>
        </Link>
      </div>

      {isLoading && items.length === 0 ? (
        <TableSkeleton rows={5} columns={5} />
      ) : (
        <div className="rounded-lg border border-zinc-200">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Fields</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>{item.slug}</TableCell>
                  <TableCell>{item.fields?.length ?? 0}</TableCell>
                  <TableCell>
                    <Badge variant={item.status === 'active' ? 'success' : 'secondary'}>
                      {item.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="space-x-3">
                    <Link href={`/meta-objects/${item.slug}`} prefetch className="text-sm text-zinc-600 hover:underline">
                      Schema
                    </Link>
                    <Link
                      href={`/meta-objects/${item.slug}/entries`}
                      prefetch
                      className="text-sm text-zinc-600 hover:underline"
                    >
                      Entries
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

'use client';

import { Button, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@zodyk/shared-ui';
import Link from 'next/link';
import { useApi } from '@/hooks/use-api';
import { TableSkeleton } from '@/components/skeletons';

interface MenuRow {
  id: string;
  title: string;
  handle: string;
  itemCount: number;
}

interface MenusResponse {
  data: MenuRow[];
}

export default function MenusListPage() {
  const { data, isLoading } = useApi<MenusResponse>('/api/v1/menus');
  const items = data?.data ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Menus</h1>
          <p className="text-muted-foreground">Manage navigation menus for your storefront</p>
        </div>
        <Link href="/menus/new" prefetch>
          <Button>Add menu</Button>
        </Link>
      </div>

      {isLoading && !data ? (
        <TableSkeleton rows={5} columns={4} />
      ) : items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center">
          <p className="text-muted-foreground">No menus yet. Create your first navigation menu.</p>
          <Link href="/menus/new" prefetch className="mt-4 inline-block">
            <Button variant="outline" className="mt-4">
              Add menu
            </Button>
          </Link>
        </div>
      ) : (
        <div className="rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Handle</TableHead>
                <TableHead>Items</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.title}</TableCell>
                  <TableCell>{item.handle}</TableCell>
                  <TableCell>{item.itemCount}</TableCell>
                  <TableCell>
                    <Link
                      href={`/menus/${item.id}`}
                      prefetch
                      className="text-sm text-muted-foreground hover:underline"
                    >
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

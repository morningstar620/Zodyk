'use client';

import { Badge, Button, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@zodyk/shared-ui';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { TableSkeleton } from '@/components/skeletons';

interface EntryRow {
  id: string;
  status: string;
  data: Record<string, unknown>;
  updatedAt: string;
}

export default function MetaEntriesPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;

  const [typeName, setTypeName] = useState(slug);
  const [entries, setEntries] = useState<EntryRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`/api/v1/meta-objects/${slug}`).then((r) => r.json()),
      fetch(`/api/v1/meta-objects/${slug}/entries`).then((r) => r.json()),
    ])
      .then(([type, result]) => {
        setTypeName(type.name ?? slug);
        setEntries(result.data ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [slug]);

  function entryLabel(data: Record<string, unknown>): string {
    const candidate = data.title ?? data.name ?? data.quote;
    return typeof candidate === 'string' ? candidate : JSON.stringify(data).slice(0, 40);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">{typeName} entries</h1>
          <p className="text-zinc-600">Manage content entries for {slug}</p>
        </div>
        <div className="flex gap-2">
          <Link href={`/meta-objects/${slug}`}>
            <Button variant="outline">Edit schema</Button>
          </Link>
          <Link href={`/meta-objects/${slug}/entries/new`}>
            <Button>New entry</Button>
          </Link>
        </div>
      </div>

      {loading ? <TableSkeleton rows={6} columns={4} /> : (
        <div className="rounded-lg border border-zinc-200">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="font-medium">{entryLabel(entry.data)}</TableCell>
                  <TableCell>
                    <Badge variant={entry.status === 'published' ? 'success' : 'secondary'}>
                      {entry.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{new Date(entry.updatedAt).toLocaleString()}</TableCell>
                  <TableCell>
                    <Link
                      href={`/meta-objects/${slug}/entries/${entry.id}`}
                      className="text-sm text-zinc-600 hover:underline"
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

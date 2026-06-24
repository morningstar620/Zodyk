'use client';

import { ALL_PERMISSIONS } from '@zodyk/core';
import {
  Badge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@zodyk/shared-ui';
import Link from 'next/link';
import { useApi } from '@/hooks/use-api';
import { TableSkeleton } from '@/components/skeletons';

interface Role {
  id: string;
  name: string;
  slug: string;
  permissions: string[];
  isSystem: boolean;
}

export default function RolesPage() {
  const { data: roles = [], isLoading } = useApi<Role[]>('/api/v1/roles');

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Roles</h1>
        <p className="text-zinc-600">Manage role-based access control permissions</p>
      </div>

      {isLoading && roles.length === 0 ? (
        <TableSkeleton rows={5} columns={5} />
      ) : (
        <div className="rounded-lg border border-zinc-200">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Permissions</TableHead>
                <TableHead>Type</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {roles.map((role) => (
                <TableRow key={role.id}>
                  <TableCell className="font-medium">{role.name}</TableCell>
                  <TableCell>
                    <code className="text-xs">{role.slug}</code>
                  </TableCell>
                  <TableCell>
                    <div className="flex max-w-md flex-wrap gap-1">
                      {role.permissions.slice(0, 4).map((p) => (
                        <Badge key={p} variant="secondary">
                          {p}
                        </Badge>
                      ))}
                      {role.permissions.length > 4 && (
                        <Badge variant="secondary">+{role.permissions.length - 4}</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={role.isSystem ? 'default' : 'secondary'}>
                      {role.isSystem ? 'System' : 'Custom'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Link href={`/roles/${role.id}`} prefetch className="text-sm text-zinc-600 hover:underline">
                      {role.isSystem ? 'View' : 'Edit'}
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <div className="rounded-lg border border-zinc-200 p-4">
        <h2 className="mb-2 font-medium text-zinc-900">Available permissions</h2>
        <div className="flex flex-wrap gap-1">
          {ALL_PERMISSIONS.map((p) => (
            <Badge key={p} variant="secondary">
              {p}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
}

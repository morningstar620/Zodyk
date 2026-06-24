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
import { useApi } from '@/hooks/use-api';
import { TableSkeleton } from '@/components/skeletons';

interface UserRow {
  id: string;
  name: string;
  email: string;
  status: string;
  roles: { name: string; slug: string }[];
  mfaEnabled: boolean;
  lastLoginAt?: string;
}

interface UsersResponse {
  data: UserRow[];
}

export default function UsersPage() {
  const { data, isLoading } = useApi<UsersResponse>('/api/v1/users');
  const users = data?.data ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Users</h1>
          <p className="text-zinc-600">Manage admin users and role assignments</p>
        </div>
        <Link href="/users/new" prefetch>
          <Button>Add user</Button>
        </Link>
      </div>

      {isLoading && !data ? (
        <TableSkeleton rows={6} columns={6} />
      ) : (
        <div className="rounded-lg border border-zinc-200">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Roles</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>MFA</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {user.roles.map((role) => (
                        <Badge key={role.slug} variant="secondary">
                          {role.name}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.status === 'active' ? 'success' : 'destructive'}>
                      {user.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{user.mfaEnabled ? 'Enabled' : 'Off'}</TableCell>
                  <TableCell>
                    <Link href={`/users/${user.id}`} prefetch className="text-sm text-zinc-600 hover:underline">
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

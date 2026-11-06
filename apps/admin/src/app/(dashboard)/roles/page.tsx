'use client';

import { ALL_PERMISSIONS } from '@zodyk/core';
import {
  Alert,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Checkbox,
  Input,
  Label,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@zodyk/shared-ui';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useState } from 'react';
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
  const router = useRouter();
  const { data: session } = useSession();
  const { data: roles = [], isLoading } = useApi<Role[]>('/api/v1/roles');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [permissions, setPermissions] = useState<string[]>([]);
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const canCreateRole = session?.permissions?.some(
    (permission) =>
      permission === '*' || permission === 'roles:*' || permission === 'roles:create',
  );

  function togglePermission(permission: string) {
    setPermissions((current) =>
      current.includes(permission)
        ? current.filter((value) => value !== permission)
        : [...current, permission],
    );
  }

  async function handleCreateRole(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreating(true);
    setCreateError(null);

    try {
      const response = await fetch('/api/v1/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, slug, permissions }),
      });

      if (!response.ok) {
        const body = await response.json();
        setCreateError(body.error ?? 'Failed to create role');
        return;
      }

      const role = (await response.json()) as { id: string };
      router.push(`/roles/${role.id}`);
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : 'Failed to create role');
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Roles</h1>
          <p className="text-zinc-600">Manage role-based access control permissions</p>
        </div>
        {canCreateRole && (
          <Button
            type="button"
            onClick={() => {
              setShowCreateForm((shown) => !shown);
              setCreateError(null);
            }}
          >
            {showCreateForm ? 'Cancel' : 'Create role'}
          </Button>
        )}
      </div>

      {showCreateForm && canCreateRole && (
        <Card>
          <CardHeader>
            <CardTitle>Create role</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateRole} className="flex flex-col gap-4">
              {createError && <Alert variant="destructive">{createError}</Alert>}
              <div className="flex flex-col gap-2">
                <Label htmlFor="role-name">Name</Label>
                <Input
                  id="role-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  maxLength={50}
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="role-slug">Slug</Label>
                <Input
                  id="role-slug"
                  value={slug}
                  onChange={(event) => setSlug(event.target.value)}
                  maxLength={50}
                  pattern="[a-z][a-z0-9_]*"
                  required
                />
                <p className="text-sm text-zinc-500">
                  Use lowercase letters, numbers, and underscores; start with a letter.
                </p>
              </div>
              <fieldset className="flex flex-col gap-2">
                <legend className="mb-2 text-sm font-medium">Permissions</legend>
                <div className="grid grid-cols-2 gap-2">
                  {ALL_PERMISSIONS.map((permission) => (
                    <label key={permission} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={permissions.includes(permission)}
                        onChange={() => togglePermission(permission)}
                      />
                      {permission}
                    </label>
                  ))}
                </div>
              </fieldset>
              {permissions.length === 0 && (
                <p className="text-sm text-zinc-500">Select at least one permission.</p>
              )}
              <Button type="submit" disabled={creating || permissions.length === 0}>
                {creating ? 'Creating...' : 'Create role'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

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

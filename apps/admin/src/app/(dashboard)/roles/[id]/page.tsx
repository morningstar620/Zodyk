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
} from '@zodyk/shared-ui';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { FormSkeleton } from '@/components/skeletons';

interface RoleDetail {
  id: string;
  name: string;
  slug: string;
  permissions: string[];
  isSystem: boolean;
}

export default function EditRolePage() {
  const params = useParams();
  const id = params.id as string;
  const [role, setRole] = useState<RoleDetail | null>(null);
  const [name, setName] = useState('');
  const [permissions, setPermissions] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/v1/roles/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setRole(data);
        setName(data.name);
        setPermissions(data.permissions);
        setLoading(false);
      });
  }, [id]);

  function togglePermission(perm: string) {
    setPermissions((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm],
    );
  }

  async function handleSave() {
    if (!role || role.isSystem) return;
    setSaving(true);
    setError(null);

    const res = await fetch(`/api/v1/roles/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, permissions }),
    });

    setSaving(false);
    if (!res.ok) {
      const json = await res.json();
      setError(json.error ?? 'Failed to update role');
      return;
    }
    setSuccess('Role updated');
  }

  if (loading || !role) return <FormSkeleton fields={6} />;

  return (
    <div className="max-w-2xl">
      <h1 className="mb-6 text-2xl font-semibold text-zinc-900">
        {role.isSystem ? 'View role' : 'Edit role'}
      </h1>
      <Card>
        <CardHeader>
          <CardTitle>
            {role.name}{' '}
            <Badge variant={role.isSystem ? 'default' : 'secondary'} className="ml-2">
              {role.isSystem ? 'System' : 'Custom'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {error && <Alert variant="destructive">{error}</Alert>}
          {success && <Alert variant="success">{success}</Alert>}
          <div className="flex flex-col gap-2">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} disabled={role.isSystem} />
          </div>
          <div className="flex flex-col gap-2">
            <Label>Slug</Label>
            <code className="text-sm text-zinc-600">{role.slug}</code>
          </div>
          <div className="flex flex-col gap-2">
            <Label>Permissions</Label>
            <div className="grid grid-cols-2 gap-2">
              {ALL_PERMISSIONS.map((perm) => (
                <label key={perm} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={permissions.includes(perm) || permissions.includes('*')}
                    onChange={() => togglePermission(perm)}
                    disabled={role.isSystem}
                  />
                  {perm}
                </label>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            {!role.isSystem && (
              <Button onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save changes'}
              </Button>
            )}
            <Link href="/roles">
              <Button variant="outline">Back</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

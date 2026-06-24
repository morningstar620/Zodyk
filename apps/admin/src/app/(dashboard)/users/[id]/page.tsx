'use client';

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
  Select,
} from '@zodyk/shared-ui';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { FormSkeleton } from '@/components/skeletons';

interface Role {
  id: string;
  name: string;
  slug: string;
}

interface UserDetail {
  id: string;
  name: string;
  email: string;
  status: string;
  roleIds: string[];
  mfaEnabled: boolean;
}

export default function EditUserPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [user, setUser] = useState<UserDetail | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [name, setName] = useState('');
  const [status, setStatus] = useState('active');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetch(`/api/v1/users/${id}`), fetch('/api/v1/roles')]).then(async ([userRes, rolesRes]) => {
      const userData = await userRes.json();
      const rolesData = await rolesRes.json();
      setUser(userData);
      setName(userData.name);
      setStatus(userData.status);
      setSelectedRoles(userData.roleIds);
      setRoles(rolesData);
      setLoading(false);
    });
  }, [id]);

  function toggleRole(roleId: string) {
    setSelectedRoles((prev) =>
      prev.includes(roleId) ? prev.filter((rid) => rid !== roleId) : [...prev, roleId],
    );
  }

  async function handleSave() {
    setError(null);
    setSuccess(null);
    setSaving(true);

    const res = await fetch(`/api/v1/users/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, status, roleIds: selectedRoles }),
    });

    setSaving(false);
    if (!res.ok) {
      const json = await res.json();
      setError(json.error ?? 'Failed to update user');
      return;
    }
    setSuccess('User updated successfully');
  }

  async function handleResetPassword() {
    const res = await fetch(`/api/v1/users/${id}/reset-password`, { method: 'POST' });
    if (res.ok) setSuccess('Password reset email sent');
    else setError('Failed to send reset email');
  }

  async function handleDelete() {
    if (!confirm('Are you sure you want to suspend this user?')) return;
    const res = await fetch(`/api/v1/users/${id}`, { method: 'DELETE' });
    if (res.ok) router.push('/users');
    else setError('Failed to delete user');
  }

  if (loading || !user) return <FormSkeleton fields={5} />;

  return (
    <div className="max-w-lg">
      <h1 className="mb-6 text-2xl font-semibold text-zinc-900">Edit user</h1>
      <Card>
        <CardHeader>
          <CardTitle>{user.email}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {error && <Alert variant="destructive">{error}</Alert>}
          {success && <Alert variant="success">{success}</Alert>}
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="status">Status</Label>
            <Select id="status" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="pending">Pending</option>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label>Roles</Label>
            {roles.map((role) => (
              <label key={role.id} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={selectedRoles.includes(role.id)}
                  onChange={() => toggleRole(role.id)}
                />
                {role.name}
              </label>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-zinc-600">MFA:</span>
            <Badge variant={user.mfaEnabled ? 'success' : 'secondary'}>
              {user.mfaEnabled ? 'Enabled' : 'Disabled'}
            </Badge>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save changes'}
            </Button>
            <Button variant="outline" onClick={handleResetPassword}>
              Send password reset
            </Button>
            <Button variant="outline" onClick={handleDelete}>
              Suspend user
            </Button>
            <Link href="/users">
              <Button variant="ghost">Back</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

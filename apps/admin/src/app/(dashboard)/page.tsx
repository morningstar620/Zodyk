'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@zodyk/shared-ui';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { DashboardPageSkeleton } from '@/components/skeletons';

export default function DashboardPage() {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return <DashboardPageSkeleton />;
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Dashboard</h1>
        <p className="text-zinc-600">Welcome back, {session?.user?.name}</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Link href="/meta-objects" prefetch>
          <Card className="transition-shadow hover:shadow-md">
            <CardHeader>
              <CardTitle>Meta Objects</CardTitle>
              <CardDescription>Custom content types and entries</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-zinc-600">Define schemas and manage dynamic content</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/users" prefetch>
          <Card className="transition-shadow hover:shadow-md">
            <CardHeader>
              <CardTitle>Users</CardTitle>
              <CardDescription>Manage admin users and roles</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-zinc-600">Create, edit, and assign roles to users</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/roles" prefetch>
          <Card className="transition-shadow hover:shadow-md">
            <CardHeader>
              <CardTitle>Roles</CardTitle>
              <CardDescription>Configure RBAC permissions</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-zinc-600">View and customize role permissions</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/settings/api-tokens" prefetch>
          <Card className="transition-shadow hover:shadow-md">
            <CardHeader>
              <CardTitle>API Tokens</CardTitle>
              <CardDescription>Manage API access tokens</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-zinc-600">Generate scoped tokens for integrations</p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}

'use client';

import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@zodyk/shared-ui';
import { signIn, useSession } from 'next-auth/react';
import { ProfileSkeleton } from '@/components/skeletons';

export default function ProfilePage() {
  const { data: session, status } = useSession();

  if (status === 'loading') return <ProfileSkeleton />;

  return (
    <div className="max-w-lg">
      <h1 className="mb-6 text-2xl font-semibold text-zinc-900">Profile</h1>
      <Card>
        <CardHeader>
          <CardTitle>Account information</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm">
          <div>
            <span className="text-zinc-500">Name:</span>{' '}
            <span className="font-medium">{session?.user?.name}</span>
          </div>
          <div>
            <span className="text-zinc-500">Email:</span>{' '}
            <span className="font-medium">{session?.user?.email}</span>
          </div>
          <div>
            <span className="text-zinc-500">Tenant:</span>{' '}
            <span className="font-medium">{session?.tenantId}</span>
          </div>
          <div>
            <span className="text-zinc-500">Permissions:</span>
            <div className="mt-1 flex flex-wrap gap-1">
              {session?.permissions?.map((p) => (
                <code key={p} className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs">
                  {p}
                </code>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Linked sign-in</CardTitle>
          <CardDescription>
            Connect Google or GitHub while you are signed in. The provider email must be verified
            and match {session?.user?.email}.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => signIn('google', { callbackUrl: '/settings/profile' })}
          >
            Link Google
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => signIn('github', { callbackUrl: '/settings/profile' })}
          >
            Link GitHub
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

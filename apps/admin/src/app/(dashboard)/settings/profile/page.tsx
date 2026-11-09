'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { changePasswordSchema } from '@zodyk/core';
import type { z } from '@zodyk/core';
import {
  Alert,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
} from '@zodyk/shared-ui';
import { signIn, useSession } from 'next-auth/react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { ProfileSkeleton } from '@/components/skeletons';

type ChangePasswordForm = z.infer<typeof changePasswordSchema>;

function ChangePasswordCard() {
  const [message, setMessage] = useState<{ variant: 'success' | 'destructive'; text: string } | null>(
    null,
  );
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordForm>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  async function onSubmit(data: ChangePasswordForm) {
    setMessage(null);
    const res = await fetch('/api/auth/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setMessage({ variant: 'destructive', text: json.error ?? 'Could not change password' });
      return;
    }

    reset();
    setMessage({
      variant: 'success',
      text: 'Password changed. Older reset links and API tokens were revoked.',
    });
  }

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Change password</CardTitle>
        <CardDescription>
          Confirm your current password. Changing it revokes your existing API tokens.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          {message && <Alert variant={message.variant}>{message.text}</Alert>}
          <div className="flex flex-col gap-2">
            <Label htmlFor="currentPassword">Current password</Label>
            <Input
              id="currentPassword"
              type="password"
              autoComplete="current-password"
              {...register('currentPassword')}
            />
            {errors.currentPassword && (
              <p className="text-sm text-red-600">{errors.currentPassword.message}</p>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="newPassword">New password</Label>
            <Input
              id="newPassword"
              type="password"
              autoComplete="new-password"
              {...register('newPassword')}
            />
            {errors.newPassword && (
              <p className="text-sm text-red-600">{errors.newPassword.message}</p>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="confirmPassword">Confirm new password</Label>
            <Input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              {...register('confirmPassword')}
            />
            {errors.confirmPassword && (
              <p className="text-sm text-red-600">{errors.confirmPassword.message}</p>
            )}
          </div>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Change password'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

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
      <ChangePasswordCard />
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

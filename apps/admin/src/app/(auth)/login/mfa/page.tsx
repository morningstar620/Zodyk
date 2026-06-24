'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { mfaVerifySchema } from '@zodyk/core';
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
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { AuthCardSkeleton } from '@/components/skeletons';
import { useForm } from 'react-hook-form';

type MfaForm = z.infer<typeof mfaVerifySchema>;

function MfaLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mfaToken = searchParams.get('token') ?? '';
  const callbackUrl = searchParams.get('callbackUrl') ?? '/';
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<MfaForm>({
    resolver: zodResolver(mfaVerifySchema),
    defaultValues: { userId: mfaToken },
  });

  async function onSubmit(data: MfaForm) {
    setError(null);
    const result = await signIn('credentials', {
      email: 'mfa@zodyk.internal',
      password: `mfa:${mfaToken}:${data.code}`,
      redirect: false,
    });

    if (result?.error) {
      setError('Authentication failed');
      return;
    }

    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Two-factor authentication</CardTitle>
        <CardDescription>Enter the code from your authenticator app</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          {error && <Alert variant="destructive">{error}</Alert>}
          <div className="flex flex-col gap-2">
            <Label htmlFor="code">Authentication code</Label>
            <Input id="code" autoComplete="one-time-code" maxLength={8} {...register('code')} />
            {errors.code && <p className="text-sm text-red-600">{errors.code.message}</p>}
          </div>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Verifying...' : 'Verify'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export default function MfaLoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <Suspense fallback={<AuthCardSkeleton />}>
        <MfaLoginForm />
      </Suspense>
    </main>
  );
}

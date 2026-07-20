'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema } from '@zodyk/core';
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
  Logo,
} from '@zodyk/shared-ui';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { useForm } from 'react-hook-form';
import type { z } from '@zodyk/core';
import { AuthCardSkeleton } from '@/components/skeletons';

type LoginForm = z.infer<typeof loginSchema>;

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') ?? '/';
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  async function onSubmit(data: LoginForm) {
    setError(null);
    const result = await signIn('credentials', {
      email: data.email,
      password: data.password,
      redirect: false,
    });

    if (result?.error?.startsWith('MFA_REQUIRED:')) {
      const token = result.error.replace('MFA_REQUIRED:', '');
      router.push(`/login/mfa?token=${token}&callbackUrl=${encodeURIComponent(callbackUrl)}`);
      return;
    }

    if (result?.error) {
      setError('Invalid email or password');
      return;
    }

    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <Logo width={40} height={40} className="mb-2 h-10 w-10" />
        <CardTitle>Sign in to Zodyk</CardTitle>
        <CardDescription>Enter your credentials to access the admin panel</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          {error && <Alert variant="destructive">{error}</Alert>}
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" autoComplete="email" {...register('email')} />
            {errors.email && <p className="text-sm text-red-600">{errors.email.message}</p>}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" autoComplete="current-password" {...register('password')} />
            {errors.password && <p className="text-sm text-red-600">{errors.password.message}</p>}
          </div>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Signing in...' : 'Sign in'}
          </Button>
          <div className="flex flex-col gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => signIn('google', { callbackUrl })}
            >
              Continue with Google
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => signIn('github', { callbackUrl })}
            >
              Continue with GitHub
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => signIn('email', { email: '', callbackUrl })}
            >
              Sign in with magic link
            </Button>
          </div>
          <div className="flex flex-col gap-2 text-center text-sm text-zinc-600">
            <Link href="/forgot-password" className="hover:underline">
              Forgot password?
            </Link>
            {process.env.NEXT_PUBLIC_ALLOW_REGISTRATION === 'true' && (
              <Link href="/register" className="hover:underline">
                Create an account
              </Link>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <Suspense fallback={<AuthCardSkeleton />}>
        <LoginForm />
      </Suspense>
    </main>
  );
}

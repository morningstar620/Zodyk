'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, z } from '@zodyk/core';
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
import { useState } from 'react';
import { useForm } from 'react-hook-form';

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginForm({ magicLinkEnabled }: { magicLinkEnabled: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') ?? '/';
  const [error, setError] = useState<string | null>(null);
  const [magicLinkPending, setMagicLinkPending] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const magicLinkEmail = watch('email')?.trim() ?? '';
  const magicLinkEmailValid = z.string().email().safeParse(magicLinkEmail).success;

  async function onSubmit(data: LoginFormValues) {
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

  async function onMagicLink() {
    if (!magicLinkEnabled || !magicLinkEmailValid) return;
    setError(null);
    setMagicLinkPending(true);
    try {
      await signIn('email', { email: magicLinkEmail, callbackUrl });
    } finally {
      setMagicLinkPending(false);
    }
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
            {magicLinkEnabled ? (
              <Button
                type="button"
                variant="outline"
                disabled={!magicLinkEmailValid || magicLinkPending || isSubmitting}
                onClick={() => void onMagicLink()}
              >
                {magicLinkPending ? 'Sending magic link...' : 'Sign in with magic link'}
              </Button>
            ) : (
              <p className="text-center text-sm text-zinc-500">SMTP is not configured</p>
            )}
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

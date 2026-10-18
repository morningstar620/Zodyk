import { Suspense } from 'react';
import { AuthCardSkeleton } from '@/components/skeletons';
import { LoginForm } from './login-form';

export default function LoginPage() {
  const magicLinkEnabled = Boolean(process.env.SMTP_HOST && process.env.SMTP_FROM);

  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <Suspense fallback={<AuthCardSkeleton />}>
        <LoginForm magicLinkEnabled={magicLinkEnabled} />
      </Suspense>
    </main>
  );
}

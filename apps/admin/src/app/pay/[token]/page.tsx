import { Suspense } from 'react';
import { PayCheckout } from './checkout';

export default function PayPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6 py-16">
          <p className="text-zinc-600">Loading payment link…</p>
        </main>
      }
    >
      <PayCheckout />
    </Suspense>
  );
}

'use client';

import { Button, Input, Label } from '@zodyk/shared-ui';
import { useParams, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

interface PaymentLink {
  token: string;
  product: { name: string; description?: string; image?: string };
  price: {
    type: 'one_time' | 'recurring';
    amount: number;
    currency: string;
    interval?: string;
    intervalCount: number;
    trialDays?: number;
    nickname?: string;
  };
}

function formatMoney(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(amount / 100);
  } catch {
    return `${(amount / 100).toFixed(2)} ${currency}`;
  }
}

export function PayCheckout() {
  const params = useParams();
  const searchParams = useSearchParams();
  const token = String(params.token ?? '');
  const status = searchParams.get('status');
  const [link, setLink] = useState<PaymentLink | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(`/api/v1/payments/links/${token}`);
        const body = (await res.json()) as PaymentLink & { error?: string };
        if (!res.ok) throw new Error(body.error ?? 'Payment link not found');
        if (!cancelled) setLink(body);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Payment link not found');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const checkout = async () => {
    if (!link) return;
    setSubmitting(true);
    setError(null);
    try {
      const returnTo = (result: 'success' | 'cancel') =>
        `${window.location.origin}/pay/${token}?status=${result}`;
      const res = await fetch(`/api/v1/payments/links/${token}/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer: { email, name: name || undefined },
          successUrl: returnTo('success'),
          cancelUrl: returnTo('cancel'),
        }),
      });
      const body = (await res.json()) as { error?: string; checkoutUrl?: string };
      if (!res.ok) throw new Error(body.error ?? 'Checkout failed');
      if (body.checkoutUrl) {
        window.location.assign(body.checkoutUrl);
        return;
      }
      throw new Error('The gateway did not return a checkout URL.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Checkout failed');
      setSubmitting(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6 py-16">
      <p className="text-sm text-zinc-500">Checkout</p>
      {!link && !error && <p className="mt-4 text-zinc-600">Loading payment link…</p>}
      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      {link && (
        <div className="mt-4 rounded-xl border border-zinc-200 p-6">
          <h1 className="text-2xl font-semibold text-zinc-900">{link.product.name}</h1>
          {link.product.description && (
            <p className="mt-2 text-zinc-600">{link.product.description}</p>
          )}
          <p className="mt-4 text-xl font-medium text-zinc-900">
            {formatMoney(link.price.amount, link.price.currency)}
            {link.price.type === 'recurring' && (
              <span className="text-base font-normal text-zinc-500">
                {' '}
                / {link.price.intervalCount > 1 ? `${link.price.intervalCount} ` : ''}
                {link.price.interval}
              </span>
            )}
          </p>
          {status === 'success' && (
            <p className="mt-4 text-sm text-green-700">
              Checkout submitted. The payment stays pending until the gateway confirms it.
            </p>
          )}
          {status === 'cancel' && (
            <p className="mt-4 text-sm text-zinc-600">Checkout was cancelled. You can try again.</p>
          )}
          <form
            className="mt-6 flex flex-col gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              void checkout();
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={name} onChange={(event) => setName(event.target.value)} />
            </div>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Starting checkout…' : 'Continue to payment'}
            </Button>
          </form>
        </div>
      )}
    </main>
  );
}

'use client';

import { Badge, Button, Input, Label } from '@zodyk/shared-ui';
import { useEffect, useState } from 'react';
import { PaymentsNav, formatMoney } from '@/components/payments/payments-nav';
import { TableSkeleton } from '@/components/skeletons';
import { invalidateApi, useApi } from '@/hooks/use-api';

interface PriceRow {
  id: string;
  type: 'one_time' | 'recurring';
  amount: number;
  currency: string;
  interval?: string;
  intervalCount: number;
  trialDays?: number;
  nickname?: string;
  publicToken: string;
  status: string;
}

interface ProductRow {
  id: string;
  name: string;
  description?: string;
  status: string;
  prices: PriceRow[];
}

interface ProductsResponse {
  items: ProductRow[];
}

export default function ProductsPage() {
  const { data, isLoading } = useApi<ProductsResponse>('/api/v1/payments/products');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const createProduct = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/payments/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description: description || undefined }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? 'Could not create product');
      setName('');
      setDescription('');
      invalidateApi('/api/v1/payments/products');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create product');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Products</h1>
        <p className="text-zinc-600">
          Catalog prices get a public payment link that works without an admin session.
        </p>
      </div>
      <PaymentsNav />
      <form
        className="grid gap-3 rounded-lg border border-zinc-200 p-4 md:grid-cols-[1fr_1fr_auto]"
        onSubmit={(event) => {
          event.preventDefault();
          void createProduct();
        }}
      >
        <div className="space-y-2">
          <Label htmlFor="product-name">Name</Label>
          <Input
            id="product-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="product-description">Description</Label>
          <Input
            id="product-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </div>
        <div className="flex items-end">
          <Button type="submit" disabled={saving || !name.trim()}>
            {saving ? 'Saving…' : 'Add product'}
          </Button>
        </div>
      </form>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {isLoading && !data ? (
        <TableSkeleton rows={4} columns={3} />
      ) : (
        <div className="flex flex-col gap-4">
          {(data?.items ?? []).length === 0 ? (
            <p className="text-sm text-zinc-500">No products yet.</p>
          ) : (
            data?.items.map((product) => <ProductCard key={product.id} product={product} />)
          )}
        </div>
      )}
    </div>
  );
}

function ProductCard({ product }: { product: ProductRow }) {
  const [type, setType] = useState<'one_time' | 'recurring'>('one_time');
  const [amount, setAmount] = useState('1999');
  const [currency, setCurrency] = useState('USD');
  const [interval, setInterval] = useState('month');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [origin, setOrigin] = useState('');

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const addPrice = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/payments/prices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product.id,
          type,
          amount: Number(amount),
          currency,
          interval: type === 'recurring' ? interval : undefined,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? 'Could not create price');
      invalidateApi('/api/v1/payments/products');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create price');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-lg border border-zinc-200 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-medium text-zinc-900">{product.name}</h2>
        <Badge variant={product.status === 'active' ? 'success' : 'secondary'}>
          {product.status}
        </Badge>
      </div>
      {product.description && <p className="mt-1 text-sm text-zinc-600">{product.description}</p>}
      <ul className="mt-4 flex flex-col gap-3">
        {product.prices.length === 0 && <li className="text-sm text-zinc-500">No prices yet.</li>}
        {product.prices.map((price) => {
          const link = `${origin}/pay/${price.publicToken}`;
          return (
            <li key={price.id} className="flex flex-col gap-1 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{formatMoney(price.amount, price.currency)}</span>
                <span className="text-zinc-500">
                  {price.type === 'recurring'
                    ? `every ${price.intervalCount} ${price.interval}`
                    : 'one time'}
                </span>
                <Badge variant="secondary">{price.status}</Badge>
              </div>
              <Input readOnly value={link} aria-label={`Payment link for ${product.name}`} />
            </li>
          );
        })}
      </ul>
      <form
        className="mt-4 grid gap-3 md:grid-cols-[10rem_8rem_6rem_8rem_auto]"
        onSubmit={(event) => {
          event.preventDefault();
          void addPrice();
        }}
      >
        <select
          className="flex h-10 rounded-md border border-zinc-200 bg-white px-3 text-sm"
          value={type}
          onChange={(event) => setType(event.target.value as 'one_time' | 'recurring')}
        >
          <option value="one_time">One time</option>
          <option value="recurring">Recurring</option>
        </select>
        <Input
          aria-label="Amount in minor units"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          inputMode="numeric"
          required
        />
        <Input
          aria-label="Currency"
          value={currency}
          maxLength={3}
          onChange={(event) => setCurrency(event.target.value.toUpperCase())}
          required
        />
        <select
          className="flex h-10 rounded-md border border-zinc-200 bg-white px-3 text-sm"
          value={interval}
          disabled={type !== 'recurring'}
          onChange={(event) => setInterval(event.target.value)}
        >
          <option value="day">Day</option>
          <option value="week">Week</option>
          <option value="month">Month</option>
          <option value="year">Year</option>
        </select>
        <Button type="submit" disabled={saving}>
          {saving ? 'Saving…' : 'Add price'}
        </Button>
      </form>
      <p className="mt-2 text-xs text-zinc-500">
        Amount is in the smallest currency unit (1999 = 19.99).
      </p>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </section>
  );
}

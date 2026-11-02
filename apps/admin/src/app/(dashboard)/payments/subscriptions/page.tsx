'use client';

import {
  Badge,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@zodyk/shared-ui';
import { useMemo, useState } from 'react';
import { PaymentsNav, formatMoney } from '@/components/payments/payments-nav';
import { TableSkeleton } from '@/components/skeletons';
import { invalidateApi, useApi } from '@/hooks/use-api';

interface SubscriptionRow {
  id: string;
  amount: number;
  currency: string;
  interval: string;
  intervalCount: number;
  status: string;
  gateway: string;
  gatewaySubscriptionId?: string;
  customer?: { email?: string; name?: string };
  description?: string;
  createdAt: string;
}

interface SubscriptionsResponse {
  items: SubscriptionRow[];
  total: number;
}

export default function SubscriptionsPage() {
  const [status, setStatus] = useState('');
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    const qs = params.toString();
    return qs ? `/api/v1/payments/subscriptions?${qs}` : '/api/v1/payments/subscriptions';
  }, [status]);

  const { data, isLoading } = useApi<SubscriptionsResponse>(query);
  const items = data?.items ?? [];

  const cancel = async (id: string) => {
    setCancellingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/v1/payments/subscriptions/${id}/cancel`, { method: 'POST' });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? 'Cancel failed');
      invalidateApi('/api/v1/payments/subscriptions');
      invalidateApi('/api/v1/payments/metrics');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cancel failed');
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Subscriptions</h1>
        <p className="text-zinc-600">
          New subscriptions stay pending until the gateway confirms them.
        </p>
      </div>
      <PaymentsNav />
      <select
        className="flex h-10 w-full max-w-xs rounded-md border border-zinc-200 bg-white px-3 text-sm"
        value={status}
        onChange={(event) => setStatus(event.target.value)}
      >
        <option value="">All statuses</option>
        <option value="pending">Pending</option>
        <option value="trialing">Trialing</option>
        <option value="active">Active</option>
        <option value="past_due">Past due</option>
        <option value="paused">Paused</option>
        <option value="cancelled">Cancelled</option>
      </select>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {isLoading && !data ? (
        <TableSkeleton rows={6} columns={6} />
      ) : (
        <div className="rounded-lg border border-zinc-200">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Created</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Gateway id</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-zinc-500">
                    No subscriptions yet.
                  </TableCell>
                </TableRow>
              ) : (
                items.map((subscription) => (
                  <TableRow key={subscription.id}>
                    <TableCell className="whitespace-nowrap text-sm text-zinc-600">
                      {new Date(subscription.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-sm">
                      {subscription.customer?.email || subscription.description || '—'}
                    </TableCell>
                    <TableCell>
                      {formatMoney(subscription.amount, subscription.currency)}
                      <span className="text-zinc-500">
                        {' '}
                        / {subscription.intervalCount > 1 ? `${subscription.intervalCount} ` : ''}
                        {subscription.interval}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          subscription.status === 'active' || subscription.status === 'trialing'
                            ? 'success'
                            : subscription.status === 'cancelled'
                              ? 'destructive'
                              : 'secondary'
                        }
                      >
                        {subscription.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[180px] truncate font-mono text-xs">
                      {subscription.gatewaySubscriptionId || '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      {subscription.status !== 'cancelled' && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={cancellingId === subscription.id}
                          onClick={() => void cancel(subscription.id)}
                        >
                          {cancellingId === subscription.id ? 'Cancelling…' : 'Cancel'}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

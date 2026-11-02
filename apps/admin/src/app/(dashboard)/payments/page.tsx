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
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useApi, invalidateApi } from '@/hooks/use-api';
import { TableSkeleton } from '@/components/skeletons';
import { formatMoney, PaymentsNav } from '@/components/payments/payments-nav';

interface PaymentRow {
  id: string;
  amount: number;
  currency: string;
  status: string;
  reference: { type: string; id: string };
  gateway: string;
  description?: string;
  checkoutUrl?: string;
  createdAt: string;
  paidAt?: string;
}

interface PaymentsResponse {
  items: PaymentRow[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface PaymentMetrics {
  revenue: Array<{ currency: string; amount: number; count?: number }>;
  mrr: Array<{ currency: string; amount: number }>;
  subscribers: {
    active: number;
    trialing: number;
    past_due: number;
    paused: number;
    cancelled: number;
    pending: number;
  };
  churnRate: number;
}

function formatTotals(rows: Array<{ currency: string; amount: number }>) {
  if (rows.length === 0) return '—';
  return rows.map((row) => formatMoney(row.amount, row.currency)).join(' · ');
}

export default function PaymentsPage() {
  const [status, setStatus] = useState('');
  const [referenceType, setReferenceType] = useState('');
  const [refundingId, setRefundingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (referenceType) params.set('referenceType', referenceType);
    const qs = params.toString();
    return qs ? `/api/v1/payments?${qs}` : '/api/v1/payments';
  }, [status, referenceType]);

  const { data, isLoading } = useApi<PaymentsResponse>(query);
  const { data: metrics } = useApi<PaymentMetrics>('/api/v1/payments/metrics');
  const items = data?.items ?? [];

  const refund = async (id: string) => {
    setRefundingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/v1/payments/${id}/refund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? 'Refund failed');
      invalidateApi('/api/v1/payments');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Refund failed');
    } finally {
      setRefundingId(null);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Payments</h1>
          <p className="text-zinc-600">
            Ledger, subscriptions, and invoices. Paid orders can download a PDF invoice.
          </p>
        </div>
        <Link href="/settings/payments" className="text-sm text-zinc-600 hover:text-zinc-900">
          Gateway settings →
        </Link>
      </div>

      <PaymentsNav />

      {metrics && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-zinc-200 p-4">
            <p className="text-xs uppercase tracking-wide text-zinc-500">Revenue</p>
            <p className="mt-1 text-lg font-semibold text-zinc-900">
              {formatTotals(metrics.revenue)}
            </p>
          </div>
          <div className="rounded-lg border border-zinc-200 p-4">
            <p className="text-xs uppercase tracking-wide text-zinc-500">MRR</p>
            <p className="mt-1 text-lg font-semibold text-zinc-900">{formatTotals(metrics.mrr)}</p>
          </div>
          <div className="rounded-lg border border-zinc-200 p-4">
            <p className="text-xs uppercase tracking-wide text-zinc-500">Subscribers</p>
            <p className="mt-1 text-lg font-semibold text-zinc-900">
              {metrics.subscribers.active + metrics.subscribers.trialing}
            </p>
            <p className="text-xs text-zinc-500">
              {metrics.subscribers.active} active · {metrics.subscribers.trialing} trialing ·{' '}
              {metrics.subscribers.pending} pending
            </p>
          </div>
          <div className="rounded-lg border border-zinc-200 p-4">
            <p className="text-xs uppercase tracking-wide text-zinc-500">Churn</p>
            <p className="mt-1 text-lg font-semibold text-zinc-900">
              {(metrics.churnRate * 100).toFixed(1)}%
            </p>
            <p className="text-xs text-zinc-500">
              {metrics.subscribers.cancelled} cancelled of started subscriptions
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <select
          className="flex h-10 rounded-md border border-zinc-200 bg-white px-3 text-sm"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="requires_action">Requires action</option>
          <option value="paid">Paid</option>
          <option value="failed">Failed</option>
          <option value="refunded">Refunded</option>
          <option value="partially_refunded">Partially refunded</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <input
          className="flex h-10 rounded-md border border-zinc-200 bg-white px-3 text-sm"
          placeholder="Reference type (e.g. course)"
          value={referenceType}
          onChange={(e) => setReferenceType(e.target.value)}
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {isLoading && !data ? (
        <TableSkeleton rows={6} columns={7} />
      ) : (
        <div className="rounded-lg border border-zinc-200">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Created</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Gateway</TableHead>
                <TableHead>Description</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-zinc-500">
                    No payments yet. Call createPayment from your feature code or API.
                  </TableCell>
                </TableRow>
              ) : (
                items.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="whitespace-nowrap text-sm text-zinc-600">
                      {new Date(payment.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatMoney(payment.amount, payment.currency)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          payment.status === 'paid'
                            ? 'success'
                            : payment.status === 'failed' || payment.status === 'cancelled'
                              ? 'destructive'
                              : 'secondary'
                        }
                      >
                        {payment.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      <span className="font-medium">{payment.reference.type}</span>
                      <span className="text-zinc-400"> / </span>
                      <span className="font-mono text-xs">{payment.reference.id}</span>
                    </TableCell>
                    <TableCell>{payment.gateway}</TableCell>
                    <TableCell className="max-w-[220px] truncate text-sm text-zinc-600">
                      {payment.description || '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {(payment.status === 'paid' ||
                          payment.status === 'partially_refunded' ||
                          payment.status === 'refunded') && (
                          <a
                            className="inline-flex h-8 items-center rounded-md border border-zinc-200 px-3 text-sm hover:bg-zinc-50"
                            href={`/api/v1/payments/${payment.id}/invoice`}
                          >
                            Invoice
                          </a>
                        )}
                        {(payment.status === 'paid' || payment.status === 'partially_refunded') && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={refundingId === payment.id}
                            onClick={() => void refund(payment.id)}
                          >
                            {refundingId === payment.id ? 'Refunding…' : 'Refund'}
                          </Button>
                        )}
                      </div>
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

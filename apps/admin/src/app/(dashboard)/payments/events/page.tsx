'use client';

import {
  Badge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@zodyk/shared-ui';
import { Fragment, useState } from 'react';
import { PaymentsNav } from '@/components/payments/payments-nav';
import { TableSkeleton } from '@/components/skeletons';
import { useApi } from '@/hooks/use-api';

interface PaymentEventRow {
  id: string;
  gateway: string;
  eventId: string;
  type: string;
  paymentId?: string;
  payload: unknown;
  processed: boolean;
  processedAt?: string;
  error?: string;
  createdAt: string;
}

interface EventsResponse {
  items: PaymentEventRow[];
}

export default function PaymentEventsPage() {
  const { data, isLoading } = useApi<EventsResponse>('/api/v1/payments/events');
  const [openId, setOpenId] = useState<string | null>(null);
  const items = data?.items ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Webhook events</h1>
        <p className="text-zinc-600">
          Events stay unprocessed until the handler finishes. Replay a failed event to run it again.
        </p>
      </div>
      <PaymentsNav />
      {isLoading && !data ? (
        <TableSkeleton rows={6} columns={5} />
      ) : (
        <div className="rounded-lg border border-zinc-200">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Created</TableHead>
                <TableHead>Gateway</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-zinc-500">
                    No webhook events yet.
                  </TableCell>
                </TableRow>
              ) : (
                items.map((event) => (
                  <Fragment key={event.id}>
                    <TableRow>
                      <TableCell className="whitespace-nowrap text-sm text-zinc-600">
                        {new Date(event.createdAt).toLocaleString()}
                      </TableCell>
                      <TableCell>{event.gateway}</TableCell>
                      <TableCell className="font-mono text-xs">{event.type}</TableCell>
                      <TableCell>
                        <Badge variant={event.processed ? 'success' : 'secondary'}>
                          {event.processed ? 'processed' : 'unprocessed'}
                        </Badge>
                        {event.error && <p className="mt-1 text-xs text-red-600">{event.error}</p>}
                      </TableCell>
                      <TableCell className="text-right">
                        <button
                          type="button"
                          className="text-sm text-zinc-700 underline"
                          onClick={() =>
                            setOpenId((current) => (current === event.id ? null : event.id))
                          }
                        >
                          {openId === event.id ? 'Hide payload' : 'Payload'}
                        </button>
                      </TableCell>
                    </TableRow>
                    {openId === event.id && (
                      <TableRow>
                        <TableCell colSpan={5}>
                          <p className="mb-2 font-mono text-xs text-zinc-500">{event.eventId}</p>
                          <pre className="max-h-80 overflow-auto rounded-md bg-zinc-950 p-3 text-xs text-zinc-100">
                            {JSON.stringify(event.payload, null, 2)}
                          </pre>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

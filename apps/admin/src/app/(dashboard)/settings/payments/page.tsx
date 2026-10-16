'use client';

import {
  Alert,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
} from '@zodyk/shared-ui';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { FormSkeleton } from '@/components/skeletons';

interface CredentialField {
  key: string;
  label: string;
  secret?: boolean;
  required?: boolean;
  placeholder?: string;
}

interface GatewayMeta {
  id: string;
  label: string;
  description?: string;
  region?: string;
  ready: boolean;
  credentialFields: CredentialField[];
}

interface PaymentsSettingsResponse {
  configured: boolean;
  source: 'env' | 'db' | null;
  readOnly?: boolean;
  activeGateway: string | null;
  mode: 'test' | 'live';
  gateways: GatewayMeta[];
  credentials: Record<string, string>;
}

export default function PaymentsSettingsPage() {
  const [status, setStatus] = useState<PaymentsSettingsResponse | null>(null);
  const [activeGateway, setActiveGateway] = useState('');
  const [mode, setMode] = useState<'test' | 'live'>('test');
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selected = useMemo(
    () => status?.gateways.find((g) => g.id === activeGateway),
    [status, activeGateway],
  );

  const webhookUrl =
    typeof window !== 'undefined' && activeGateway
      ? `${window.location.origin}/api/v1/payments/webhooks/${activeGateway}`
      : activeGateway
        ? `/api/v1/payments/webhooks/${activeGateway}`
        : '';

  const load = async () => {
    const res = await fetch('/api/v1/settings/payments');
    const data = (await res.json()) as PaymentsSettingsResponse;
    setStatus(data);
    const gateway = data.activeGateway || data.gateways[0]?.id || '';
    setActiveGateway(gateway);
    setMode(data.mode || 'test');
    setValues(data.credentials || {});
  };

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (!status) return;
    if (activeGateway === status.activeGateway) {
      setValues(status.credentials || {});
    } else {
      setValues({});
    }
  }, [activeGateway, status]);

  const save = async () => {
    if (!selected) return;
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const credentials: Record<string, string> = {};
      for (const field of selected.credentialFields) {
        const value = values[field.key];
        if (value && !value.includes('*')) {
          credentials[field.key] = value;
        }
      }
      const res = await fetch('/api/v1/settings/payments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activeGateway,
          mode,
          gateway: activeGateway,
          credentials,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to save');
      setStatus(data);
      setMessage('Payment gateway settings saved.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (!status) {
    return (
      <div className="mx-auto max-w-2xl">
        <FormSkeleton fields={6} />
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <Link href="/settings" className="text-sm text-zinc-500 hover:text-zinc-700">
          ← Settings
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-zinc-900">Payments</h1>
        <p className="text-zinc-600">
          Connect a payment gateway. Other features (courses, bookings, invoices) can charge
          through this layer.
        </p>
      </div>

      {status.readOnly && (
        <Alert>
          Payments are configured via environment variables. Update your deployment env to
          change settings.
        </Alert>
      )}

      {status.configured && !status.readOnly && (
        <Alert>
          Active gateway: {status.activeGateway} ({status.mode} mode, source {status.source}).
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Gateway</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="gateway">Provider</Label>
            <select
              id="gateway"
              className="flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm"
              value={activeGateway}
              disabled={status.readOnly}
              onChange={(e) => setActiveGateway(e.target.value)}
            >
              {status.gateways.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.label}
                  {!g.ready ? ' (adapter pending)' : ''}
                  {g.region ? ` — ${g.region}` : ''}
                </option>
              ))}
            </select>
            {selected?.description && (
              <p className="text-sm text-zinc-500">{selected.description}</p>
            )}
            {selected && !selected.ready && (
              <Badge variant="secondary">Adapter pending — credentials can be saved for later</Badge>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="mode">Mode</Label>
            <select
              id="mode"
              className="flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm"
              value={mode}
              disabled={status.readOnly}
              onChange={(e) => setMode(e.target.value as 'test' | 'live')}
            >
              <option value="test">Test</option>
              <option value="live">Live</option>
            </select>
          </div>

          {selected?.credentialFields.map((field) => (
            <div key={field.key} className="space-y-2">
              <Label htmlFor={`cred-${field.key}`}>
                {field.label}
                {field.required ? ' *' : ''}
              </Label>
              <Input
                id={`cred-${field.key}`}
                type={field.secret ? 'password' : 'text'}
                value={values[field.key] ?? ''}
                onChange={(e) =>
                  setValues((prev) => ({ ...prev, [field.key]: e.target.value }))
                }
                disabled={status.readOnly}
                placeholder={
                  field.secret && status.configured && activeGateway === status.activeGateway
                    ? 'Leave blank to keep existing'
                    : field.placeholder
                }
              />
            </div>
          ))}

          {webhookUrl && (
            <div className="space-y-2">
              <Label>Webhook URL</Label>
              <Input readOnly value={webhookUrl} />
              <p className="text-xs text-zinc-500">
                Paste this URL into your gateway dashboard and set the matching webhook secret
                above.
              </p>
            </div>
          )}

          {message && <p className="text-sm text-green-700">{message}</p>}
          {error && <p className="text-sm text-red-600">{error}</p>}

          {!status.readOnly && (
            <Button type="button" onClick={() => void save()} disabled={saving || !activeGateway}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

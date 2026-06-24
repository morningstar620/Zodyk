'use client';

import { Alert, Button, Card, CardContent, CardHeader, CardTitle, Input, Label } from '@zodyk/shared-ui';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { FormSkeleton } from '@/components/skeletons';

interface MediaSettingsResponse {
  configured: boolean;
  source: 'env' | 'db' | null;
  readOnly?: boolean;
  settings?: {
    accountId: string;
    accessKeyId?: string;
    accessKeyIdMasked: string;
    bucket: string;
    publicUrl?: string;
    endpoint?: string;
  };
}

export default function IntegrationsSettingsPage() {
  const [status, setStatus] = useState<MediaSettingsResponse | null>(null);
  const [accountId, setAccountId] = useState('');
  const [accessKeyId, setAccessKeyId] = useState('');
  const [secretAccessKey, setSecretAccessKey] = useState('');
  const [bucket, setBucket] = useState('');
  const [publicUrl, setPublicUrl] = useState('');
  const [endpoint, setEndpoint] = useState('');
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    const res = await fetch('/api/v1/settings/media');
    const data = (await res.json()) as MediaSettingsResponse;
    setStatus(data);
    if (data.settings) {
      setAccountId(data.settings.accountId);
      setAccessKeyId('accessKeyId' in data.settings ? (data.settings.accessKeyId as string) : '');
      setBucket(data.settings.bucket);
      setPublicUrl(data.settings.publicUrl ?? '');
      setEndpoint(data.settings.endpoint ?? '');
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const save = async (testConnection: boolean) => {
    setSaving(!testConnection);
    setTesting(testConnection);
    setMessage(null);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        accountId,
        accessKeyId,
        bucket,
        publicUrl: publicUrl || undefined,
        endpoint: endpoint || undefined,
        testConnection,
      };
      if (secretAccessKey) {
        body.secretAccessKey = secretAccessKey;
      }
      const res = await fetch('/api/v1/settings/media', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to save');
      setStatus(data);
      setMessage(testConnection ? 'Connection successful and settings saved.' : 'Settings saved.');
      setSecretAccessKey('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
      setTesting(false);
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
        <h1 className="mt-2 text-2xl font-semibold text-zinc-900">Integrations</h1>
        <p className="text-zinc-600">Configure Cloudflare R2 for media storage</p>
      </div>

      {status?.readOnly && (
        <Alert>
          R2 is configured via environment variables. Update your deployment env to change
          settings.
        </Alert>
      )}

      {status?.configured && !status.readOnly && (
        <Alert>Media storage is configured ({status.source}).</Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Cloudflare R2</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="r2-account">Account ID</Label>
            <Input
              id="r2-account"
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              disabled={status?.readOnly}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="r2-access-key">Access Key ID</Label>
            <Input
              id="r2-access-key"
              value={accessKeyId}
              onChange={(e) => setAccessKeyId(e.target.value)}
              disabled={status?.readOnly}
              placeholder={status?.settings?.accessKeyIdMasked}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="r2-secret">Secret Access Key</Label>
            <Input
              id="r2-secret"
              type="password"
              value={secretAccessKey}
              onChange={(e) => setSecretAccessKey(e.target.value)}
              disabled={status?.readOnly}
              placeholder={status?.configured ? 'Leave blank to keep existing' : 'Required'}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="r2-bucket">Bucket</Label>
            <Input
              id="r2-bucket"
              value={bucket}
              onChange={(e) => setBucket(e.target.value)}
              disabled={status?.readOnly}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="r2-public-url">Public URL (optional CDN domain)</Label>
            <Input
              id="r2-public-url"
              value={publicUrl}
              onChange={(e) => setPublicUrl(e.target.value)}
              disabled={status?.readOnly}
              placeholder="https://media.example.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="r2-endpoint">Endpoint (optional)</Label>
            <Input
              id="r2-endpoint"
              value={endpoint}
              onChange={(e) => setEndpoint(e.target.value)}
              disabled={status?.readOnly}
              placeholder="https://&lt;account&gt;.r2.cloudflarestorage.com"
            />
          </div>

          {message && <p className="text-sm text-green-700">{message}</p>}
          {error && <p className="text-sm text-red-600">{error}</p>}

          {!status?.readOnly && (
            <div className="flex gap-2">
              <Button type="button" onClick={() => void save(false)} disabled={saving}>
                {saving ? 'Saving…' : 'Save'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => void save(true)}
                disabled={testing}
              >
                {testing ? 'Testing…' : 'Test & save'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

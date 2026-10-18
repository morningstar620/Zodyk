'use client';

import {
  Alert,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Select,
} from '@zodyk/shared-ui';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { FormSkeleton } from '@/components/skeletons';

interface SeoSettings {
  robotsTxt: string;
  sitemapUrl: string;
  siteUrl: string;
}

interface RedirectRecord {
  id: string;
  fromPath: string;
  toPath: string;
  statusCode: 301 | 302;
  enabled: boolean;
}

export default function SeoSettingsPage() {
  const [settings, setSettings] = useState<SeoSettings | null>(null);
  const [robotsTxt, setRobotsTxt] = useState('');
  const [redirects, setRedirects] = useState<RedirectRecord[]>([]);
  const [fromPath, setFromPath] = useState('');
  const [toPath, setToPath] = useState('');
  const [statusCode, setStatusCode] = useState<'301' | '302'>('301');
  const [loading, setLoading] = useState(true);
  const [savingRobots, setSavingRobots] = useState(false);
  const [savingRedirect, setSavingRedirect] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    const [settingsRes, redirectsRes] = await Promise.all([
      fetch('/api/v1/settings/seo'),
      fetch('/api/v1/redirects'),
    ]);
    const settingsData = (await settingsRes.json()) as SeoSettings & { error?: string };
    const redirectsData = (await redirectsRes.json()) as {
      data?: RedirectRecord[];
      error?: string;
    };
    if (!settingsRes.ok) throw new Error(settingsData.error ?? 'Failed to load SEO settings');
    if (!redirectsRes.ok) throw new Error(redirectsData.error ?? 'Failed to load redirects');
    setSettings(settingsData);
    setRobotsTxt(settingsData.robotsTxt ?? '');
    setRedirects(redirectsData.data ?? []);
  };

  useEffect(() => {
    void load()
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Failed to load SEO settings');
      })
      .finally(() => setLoading(false));
  }, []);

  const saveRobots = async () => {
    setSavingRobots(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch('/api/v1/settings/seo', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ robotsTxt }),
      });
      const data = (await res.json()) as SeoSettings & { error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Failed to save robots.txt');
      setSettings(data);
      setRobotsTxt(data.robotsTxt ?? '');
      setMessage('Robots.txt saved.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save robots.txt');
    } finally {
      setSavingRobots(false);
    }
  };

  const createRedirect = async () => {
    setSavingRedirect(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch('/api/v1/redirects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fromPath, toPath, statusCode: Number(statusCode) }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Failed to create redirect');
      setFromPath('');
      setToPath('');
      setStatusCode('301');
      await load();
      setMessage('Redirect created.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create redirect');
    } finally {
      setSavingRedirect(false);
    }
  };

  const removeRedirect = async (id: string) => {
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/v1/redirects/${id}`, { method: 'DELETE' });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Failed to delete redirect');
      setRedirects((current) => current.filter((item) => item.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete redirect');
    }
  };

  if (loading) {
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
        <h1 className="mt-2 text-2xl font-semibold text-zinc-900">SEO</h1>
        <p className="text-zinc-600">Robots.txt and storefront redirects</p>
      </div>

      {message && <Alert>{message}</Alert>}
      {error && <Alert variant="destructive">{error}</Alert>}

      <Card>
        <CardHeader>
          <CardTitle>Robots.txt</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-zinc-600">
            Leave this empty to serve the default file, which allows all crawlers and points at{' '}
            {settings?.sitemapUrl ?? '/sitemap.xml'}. A custom file gets that sitemap line appended
            when it does not already include one.
          </p>
          <div className="space-y-2">
            <Label htmlFor="robots-txt">Contents</Label>
            <textarea
              id="robots-txt"
              value={robotsTxt}
              onChange={(e) => setRobotsTxt(e.target.value)}
              rows={8}
              placeholder={'User-agent: *\nAllow: /'}
              className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 font-mono text-sm"
            />
          </div>
          <Button type="button" onClick={() => void saveRobots()} disabled={savingRobots}>
            {savingRobots ? 'Saving…' : 'Save robots.txt'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Redirects</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="redirect-from">From</Label>
              <Input
                id="redirect-from"
                value={fromPath}
                onChange={(e) => setFromPath(e.target.value)}
                placeholder="/old-page"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="redirect-to">To</Label>
              <Input
                id="redirect-to"
                value={toPath}
                onChange={(e) => setToPath(e.target.value)}
                placeholder="/new-page"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="redirect-status">Status</Label>
            <Select
              id="redirect-status"
              value={statusCode}
              onChange={(e) => setStatusCode(e.target.value === '302' ? '302' : '301')}
            >
              <option value="301">301 Moved permanently</option>
              <option value="302">302 Found</option>
            </Select>
          </div>
          <Button
            type="button"
            onClick={() => void createRedirect()}
            disabled={savingRedirect || !fromPath.trim() || !toPath.trim()}
          >
            {savingRedirect ? 'Saving…' : 'Add redirect'}
          </Button>

          {redirects.length === 0 ? (
            <p className="text-sm text-zinc-500">No redirects yet.</p>
          ) : (
            <ul className="divide-y divide-zinc-200 rounded-md border border-zinc-200">
              {redirects.map((redirect) => (
                <li key={redirect.id} className="flex items-center justify-between gap-3 px-3 py-2">
                  <div className="min-w-0 text-sm">
                    <p className="truncate font-medium text-zinc-900">
                      {redirect.fromPath} → {redirect.toPath}
                    </p>
                    <p className="text-zinc-500">{redirect.statusCode}</p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => void removeRedirect(redirect.id)}
                  >
                    Delete
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

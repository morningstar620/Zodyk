'use client';

import type { LocalizationSettings } from '@zodyk/core';
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

export default function LocalizationSettingsPage() {
  const [defaultLocale, setDefaultLocale] = useState('en');
  const [locales, setLocales] = useState<string[]>(['en']);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/v1/settings/localization')
      .then(async (response) => {
        const data = (await response.json()) as LocalizationSettings & { error?: string };
        if (!response.ok) throw new Error(data.error ?? 'Failed to load localization settings');
        setDefaultLocale(data.defaultLocale);
        setLocales(data.locales);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Failed to load localization settings');
      })
      .finally(() => setLoading(false));
  }, []);

  function addLocale() {
    const code = draft.trim().toLowerCase();
    if (!code || locales.includes(code)) return;
    setLocales([...locales, code]);
    setDraft('');
  }

  async function save() {
    setSaving(true);
    setError(null);
    setMessage(null);
    const res = await fetch('/api/v1/settings/localization', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ defaultLocale, locales }),
    });
    const data = (await res.json()) as LocalizationSettings & { error?: string };
    if (!res.ok) {
      setError(data.error ?? 'Failed to save localization settings');
      setSaving(false);
      return;
    }
    setDefaultLocale(data.defaultLocale);
    setLocales(data.locales);
    setMessage('Localization settings saved');
    setSaving(false);
  }

  if (loading) return <FormSkeleton />;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <Link href="/settings" className="text-sm text-muted-foreground hover:text-foreground">
          ← Settings
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-foreground">Localization</h1>
        <p className="text-sm text-muted-foreground">
          These locales appear on meta object entries and system records.
        </p>
      </div>

      {error && <Alert variant="destructive">{error}</Alert>}
      {message && <Alert>{message}</Alert>}

      <Card>
        <CardHeader>
          <CardTitle>Content locales</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="default-locale">Default locale</Label>
            <Select
              id="default-locale"
              value={defaultLocale}
              onChange={(event) => setDefaultLocale(event.target.value)}
            >
              {locales.map((locale) => (
                <option key={locale} value={locale}>
                  {locale}
                </option>
              ))}
            </Select>
          </div>
          <ul className="space-y-2">
            {locales.map((locale) => (
              <li
                key={locale}
                className="flex items-center justify-between rounded-md border border-border px-3 py-2"
              >
                <span className="text-sm">{locale}</span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={locales.length <= 1 || locale === defaultLocale}
                  onClick={() => setLocales(locales.filter((item) => item !== locale))}
                >
                  Remove
                </Button>
              </li>
            ))}
          </ul>
          <div className="flex gap-2">
            <Input
              value={draft}
              placeholder="en-US"
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  addLocale();
                }
              }}
            />
            <Button type="button" variant="outline" onClick={addLocale}>
              Add
            </Button>
          </div>
          <Button type="button" onClick={save} disabled={saving}>
            Save locales
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

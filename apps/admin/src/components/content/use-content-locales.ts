'use client';

import { defaultLocalizationSettings, type LocalizationSettings } from '@zodyk/core';
import { useEffect, useState } from 'react';

export function useContentLocales(): LocalizationSettings & { ready: boolean } {
  const [settings, setSettings] = useState<LocalizationSettings>(() =>
    defaultLocalizationSettings(),
  );
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/v1/settings/localization')
      .then(async (response) => (response.ok ? response.json() : null))
      .then((data: LocalizationSettings | null) => {
        if (cancelled || !data?.locales?.length || !data.defaultLocale) return;
        if (!data.locales.includes(data.defaultLocale)) return;
        setSettings({ defaultLocale: data.defaultLocale, locales: data.locales });
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { ...settings, ready };
}

export function useActiveContentLocale() {
  const { locales, defaultLocale, ready } = useContentLocales();
  const [activeLocale, setActiveLocale] = useState(defaultLocale);
  const [seenDefault, setSeenDefault] = useState(defaultLocale);

  useEffect(() => {
    setActiveLocale((current) => {
      if (!locales.includes(current) || current === seenDefault) return defaultLocale;
      return current;
    });
    setSeenDefault(defaultLocale);
  }, [defaultLocale, locales, seenDefault]);

  return { locales, defaultLocale, activeLocale, setActiveLocale, ready };
}

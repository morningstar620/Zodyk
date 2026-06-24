'use client';

import { Button } from '@zodyk/shared-ui';

interface LocaleTabsProps {
  locales: readonly string[];
  activeLocale: string;
  defaultLocale: string;
  onChange: (locale: string) => void;
}

export function LocaleTabs({ locales, activeLocale, defaultLocale, onChange }: LocaleTabsProps) {
  return (
    <div className="flex flex-wrap gap-2 border-b border-zinc-200 pb-3">
      {locales.map((locale) => (
        <Button
          key={locale}
          type="button"
          variant={activeLocale === locale ? 'default' : 'outline'}
          size="sm"
          onClick={() => onChange(locale)}
        >
          {locale.toUpperCase()}
          {locale === defaultLocale ? ' (default)' : ''}
        </Button>
      ))}
    </div>
  );
}

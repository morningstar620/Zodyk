'use client';

import { ThemeCustomizer } from '@zodyk/builder';
import { use } from 'react';

export default function CustomizeThemePage({
  params,
}: {
  params: Promise<{ themeId: string }>;
}) {
  const { themeId } = use(params);
  const websiteUrl =
    typeof window !== 'undefined'
      ? process.env.NEXT_PUBLIC_WEBSITE_URL
      : process.env.NEXT_PUBLIC_WEBSITE_URL;

  return <ThemeCustomizer themeId={themeId} websiteUrl={websiteUrl ?? 'http://localhost:3001'} />;
}

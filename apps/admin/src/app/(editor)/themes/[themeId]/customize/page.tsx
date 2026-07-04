'use client';

import dynamic from 'next/dynamic';
import { Skeleton } from '@zodyk/shared-ui';
import { CustomizerProvider } from '@zodyk/builder';
import type { SettingControlProps } from '@zodyk/builder';
import { use } from 'react';

const ThemeCustomizer = dynamic(
  () => import('@zodyk/builder').then((m) => m.ThemeCustomizer),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-screen flex-col bg-zinc-100">
        <div className="flex h-12 items-center gap-3 border-b border-zinc-200 bg-white px-4">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-6 w-32" />
        </div>
        <div className="flex flex-1 gap-4 p-4">
          <Skeleton className="h-full w-80" />
          <Skeleton className="h-full flex-1" />
        </div>
      </div>
    ),
  },
);

const RichTextEditor = dynamic(
  () => import('@/components/content/RichTextEditor').then((m) => m.RichTextEditor),
  { ssr: false },
);

const MediaPicker = dynamic(
  () => import('@/components/media/MediaPicker').then((m) => m.MediaPicker),
  { ssr: false },
);

function RichtextControl({ setting, value, onChange }: SettingControlProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-zinc-700">{setting.label}</label>
      <RichTextEditor
        value={typeof value === 'string' ? value : ''}
        onChange={(v) => onChange(v)}
      />
    </div>
  );
}

function ImageControl({ setting, value, onChange }: SettingControlProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-zinc-700">{setting.label}</label>
      <MediaPicker
        mode="single"
        value={typeof value === 'string' ? value : undefined}
        onChange={(v) => onChange(v)}
      />
    </div>
  );
}

export default function CustomizeThemePage({
  params,
}: {
  params: Promise<{ themeId: string }>;
}) {
  const { themeId } = use(params);
  const websiteUrl = process.env.NEXT_PUBLIC_WEBSITE_URL ?? 'http://localhost:3001';

  return (
    <CustomizerProvider
      controls={{
        richtext: RichtextControl,
        image: ImageControl,
        file: ImageControl,
        gallery: ImageControl,
      }}
    >
      <ThemeCustomizer themeId={themeId} websiteUrl={websiteUrl} />
    </CustomizerProvider>
  );
}

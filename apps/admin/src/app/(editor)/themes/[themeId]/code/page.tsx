'use client';

import { Suspense } from 'react';
import { use } from 'react';
import { ThemeCodeEditor } from '@/components/theme-editor/ThemeCodeEditor';

function ThemeCodeEditorPageInner({ themeId }: { themeId: string }) {
  return <ThemeCodeEditor themeId={themeId} />;
}

export default function ThemeCodeEditorPage({
  params,
}: {
  params: Promise<{ themeId: string }>;
}) {
  const { themeId } = use(params);

  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center bg-zinc-50 text-sm text-zinc-500">
          Loading editor…
        </div>
      }
    >
      <ThemeCodeEditorPageInner themeId={themeId} />
    </Suspense>
  );
}

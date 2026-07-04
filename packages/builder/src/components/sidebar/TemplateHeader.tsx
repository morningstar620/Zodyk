'use client';

import { useCustomizerStore } from '../../store';

export function TemplateHeader() {
  const { page, mode } = useCustomizerStore();

  return (
    <div className="shrink-0 border-b border-zinc-200 px-4 py-3">
      <h1 className="text-sm font-semibold text-zinc-900">
        {mode === 'theme_settings' ? 'Theme settings' : (page?.label ?? 'Template')}
      </h1>
    </div>
  );
}

'use client';

import { lazy, Suspense } from 'react';
import { Skeleton } from '@zodyk/shared-ui';
import { useCustomizerStore } from '../../store';
import { TemplateHeader } from './TemplateHeader';
import { SectionTree } from '../section-tree/SectionTree';
import { SettingsPanel } from '../settings/SettingsPanel';

const ThemeSettingsPanel = lazy(() =>
  import('../settings/ThemeSettingsPanel').then((m) => ({ default: m.ThemeSettingsPanel })),
);

const cardStyle = {
  borderRadius: 8,
  background: '#fff',
} as const;

function StickyTemplateHeader() {
  return (
    <div
      className="shrink-0"
      style={{ position: 'sticky', top: 0, zIndex: 1, background: '#fff' }}
    >
      <TemplateHeader />
    </div>
  );
}

export function Sidebar() {
  const { selectedSectionId, selectedBlockId, mode } = useCustomizerStore();

  const showSectionSettings =
    mode === 'sections' && (selectedSectionId !== null || selectedBlockId !== null);

  if (mode === 'theme_settings') {
    return (
      <div className="flex h-full min-h-0 flex-col overflow-hidden">
        <div
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
          style={cardStyle}
        >
          <StickyTemplateHeader />
          <div className="min-h-0 flex-1 overflow-y-auto">
            <Suspense fallback={<Skeleton className="mx-4 mt-4 h-32 w-[calc(100%-2rem)]" />}>
              <ThemeSettingsPanel />
            </Suspense>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex h-full min-h-0 flex-col overflow-hidden"
      style={{ gap: showSectionSettings ? 8 : 0 }}
    >
      <div
        className="flex min-h-0 flex-col overflow-hidden"
        style={{
          ...cardStyle,
          flex: showSectionSettings ? 2 : 1,
          transitionDuration: '175ms',
        }}
      >
        <StickyTemplateHeader />
        <div className="min-h-0 flex-1 overflow-y-auto">
          <SectionTree />
        </div>
      </div>

      {showSectionSettings && (
        <div
          className="flex min-h-0 flex-col overflow-hidden"
          style={{
            ...cardStyle,
            flex: 8,
            transitionDuration: '175ms',
          }}
        >
          <SettingsPanel />
        </div>
      )}
    </div>
  );
}

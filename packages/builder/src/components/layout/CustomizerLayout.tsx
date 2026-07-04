'use client';

import { lazy, Suspense } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { Skeleton } from '@zodyk/shared-ui';
import { useCustomizerStore } from '../../store';
import { Sidebar } from '../sidebar/Sidebar';
import { LivePreview } from '../preview/LivePreview';

const AddSectionDialog = lazy(() =>
  import('../add-section/AddSectionDialog').then((m) => ({ default: m.AddSectionDialog })),
);

interface CustomizerLayoutProps {
  schemasReady?: boolean;
  bootstrapLoading?: boolean;
}

export function CustomizerLayout({
  schemasReady = true,
  bootstrapLoading = false,
}: CustomizerLayoutProps) {
  const { addSectionDialogGroup, closeAddSectionDialog } = useCustomizerStore();

  return (
    <div className="flex min-h-0 flex-1">
      <PanelGroup direction="horizontal" className="flex-1">
        <Panel defaultSize={18} minSize={15} maxSize={32} className="flex flex-col" style={{ padding: '3px 0px 3px 5px' }}>
          {bootstrapLoading || !schemasReady ? (
            <div className="flex h-full flex-col gap-2 p-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-full w-full" />
            </div>
          ) : (
            <Sidebar />
          )}
        </Panel>
        <PanelResizeHandle className="w-1 bg-zinc-200 transition-colors hover:bg-blue-400 active:bg-blue-500" />
        <Panel minSize={40} className="relative flex min-h-0 flex-col" style={{ padding: '3px 5px 3px 0px' }}>
          <LivePreview />
          {addSectionDialogGroup && (
            <Suspense fallback={null}>
              <AddSectionDialog group={addSectionDialogGroup} onClose={closeAddSectionDialog} />
            </Suspense>
          )}
        </Panel>
      </PanelGroup>
    </div>
  );
}

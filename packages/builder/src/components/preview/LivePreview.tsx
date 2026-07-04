'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { Skeleton } from '@zodyk/shared-ui';
import type { TemplateJson } from '@zodyk/core';
import { useCustomizerStore } from '../../store';
import { previewBridge } from './PreviewBridge';

const PARTIAL_DEBOUNCE_MS = 50;
const FULL_DEBOUNCE_MS = 150;

function filterHiddenSections(
  template: TemplateJson,
  hiddenSections: Record<string, boolean>,
): TemplateJson {
  const hiddenIds = new Set(
    Object.entries(hiddenSections)
      .filter(([, v]) => v)
      .map(([id]) => id),
  );
  if (hiddenIds.size === 0) return template;
  return {
    ...template,
    order: template.order.filter((id) => !hiddenIds.has(id)),
  };
}

function buildLiveSettingsCss(themeSettings: Record<string, unknown>): string {
  const customCss = themeSettings.custom_css;
  if (typeof customCss !== 'string' || !customCss.trim()) return '';
  return customCss;
}

const DEVICE_WIDTH: Record<string, { width: number | string; minHeight: number }> = {
  desktop: { width: '100%', minHeight: 800 },
  tablet: { width: 768, minHeight: 1024 },
  mobile: { width: 375, minHeight: 667 },
};

export function LivePreview() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const fullDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const partialDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fullAbortRef = useRef<AbortController | null>(null);
  const partialAbortRef = useRef<AbortController | null>(null);
  const initialLoadRef = useRef(true);
  const savedFlashRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);

  const {
    themeMeta,
    device,
    page,
    themeSettings,
    previewRefreshKey,
    partialPreviewSeq,
    selectedSectionId,
    selectedBlockId,
    hoveredTarget,
    inspectorMode,
    editorMeta,
    selectSection,
    selectBlock,
    setPage,
    setTemplateJson,
    setSyncState,
  } = useCustomizerStore();

  const themeId = themeMeta.themeId;
  const hiddenSectionsKey = useMemo(
    () => JSON.stringify(editorMeta.hiddenSections),
    [editorMeta.hiddenSections],
  );

  useEffect(() => {
    previewBridge.attach(iframeRef);
    return () => previewBridge.detach();
  }, []);

  const loadFullPreview = useCallback(async () => {
    if (!page || !themeId) return;

    fullAbortRef.current?.abort();
    const controller = new AbortController();
    fullAbortRef.current = controller;

    const isInitial = initialLoadRef.current;
    if (isInitial) setInitialLoading(true);
    setSyncState('syncing');

    try {
      const state = useCustomizerStore.getState();
      const templatePath = page.templatePath.replace(/^templates\//, '');
      const hiddenIds = Object.entries(state.editorMeta.hiddenSections)
        .filter(([, v]) => v)
        .map(([id]) => id);
      const visibleTemplate = filterHiddenSections(state.templateJson, state.editorMeta.hiddenSections);

      const res = await fetch(`/api/v1/themes/${themeId}/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pathname: page.pathname,
          templatePath,
          templateJson: visibleTemplate,
          themeSettings: state.themeSettings,
          hiddenSectionIds: hiddenIds,
        }),
        signal: controller.signal,
      });

      if (!res.ok || controller.signal.aborted) {
        if (!controller.signal.aborted) setSyncState('error');
        return;
      }

      const data = (await res.json()) as { html: string };
      if (controller.signal.aborted) return;
      setPreviewHtml(data.html);
      setSyncState('idle');
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      setSyncState('error');
    } finally {
      if (!controller.signal.aborted) {
        if (isInitial) setInitialLoading(false);
      }
    }
  }, [page, themeId, setSyncState]);

  const renderSection = useCallback(
    async (sectionId: string) => {
      if (!page || !themeId) return;

      partialAbortRef.current?.abort();
      const controller = new AbortController();
      partialAbortRef.current = controller;

      setSyncState('syncing');

      const state = useCustomizerStore.getState();
      const section = state.templateJson.sections[sectionId];
      if (!section) return;

      try {
        const res = await fetch(`/api/v1/themes/${themeId}/sections/render`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sectionId,
            instance: section,
            pathname: page.pathname,
            themeSettings: state.themeSettings,
          }),
          signal: controller.signal,
        });

        if (!res.ok || controller.signal.aborted) {
          if (!controller.signal.aborted) setSyncState('error');
          return;
        }

        const data = (await res.json()) as { html: string };
        if (controller.signal.aborted) return;
        previewBridge.replaceSection(sectionId, data.html);
        setSyncState('idle');
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setSyncState('error');
      }
    },
    [page, themeId, setSyncState],
  );

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.data?.type === 'zodyk:section:select') {
        if (!useCustomizerStore.getState().inspectorMode) return;
        const { sectionId, blockId } = event.data;
        if (blockId) selectBlock(sectionId, blockId);
        else selectSection(sectionId);
      }
      if (event.data?.type === 'zodyk:preview:navigate' && event.data.pathname) {
        void (async () => {
          const state = useCustomizerStore.getState();
          const match = state.pageOptions.find((p) => p.pathname === event.data.pathname);
          if (!match || state.page?.id === match.id) return;
          const path = match.templatePath.replace(/^templates\//, '');
          const res = await fetch(`/api/v1/themes/${state.themeMeta.themeId}/templates/${path}`);
          if (!res.ok) return;
          const template = await res.json();
          setPage(match);
          setTemplateJson(template);
          state.refreshPreview();
        })();
      }
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [selectSection, selectBlock, setPage, setTemplateJson]);

  useEffect(() => {
    if (!page || !themeId) {
      setPreviewHtml(null);
      return;
    }

    setSyncState('pending');
    if (fullDebounceRef.current) clearTimeout(fullDebounceRef.current);
    fullDebounceRef.current = setTimeout(() => {
      void loadFullPreview();
    }, initialLoadRef.current ? 0 : FULL_DEBOUNCE_MS);

    return () => {
      if (fullDebounceRef.current) clearTimeout(fullDebounceRef.current);
    };
  }, [page, themeId, previewRefreshKey, themeSettings, hiddenSectionsKey, loadFullPreview, setSyncState]);

  useEffect(() => {
    if (!page || !themeId || partialPreviewSeq === 0) return;
    if (initialLoadRef.current) return;

    const sectionId = useCustomizerStore.getState().partialPreviewSectionId;
    if (!sectionId) return;

    setSyncState('pending');
    if (partialDebounceRef.current) clearTimeout(partialDebounceRef.current);
    partialDebounceRef.current = setTimeout(() => {
      void renderSection(sectionId);
    }, PARTIAL_DEBOUNCE_MS);

    return () => {
      if (partialDebounceRef.current) clearTimeout(partialDebounceRef.current);
    };
  }, [partialPreviewSeq, page, themeId, renderSection, setSyncState]);

  useEffect(() => {
    if (initialLoadRef.current || !previewHtml) return;
    const css = buildLiveSettingsCss(themeSettings);
    previewBridge.updateSettings({ customCss: css });
  }, [themeSettings, previewHtml]);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe || !previewHtml) return;

    function syncPreviewState() {
      previewBridge.setInspectorMode(useCustomizerStore.getState().inspectorMode);
      const { selectedSectionId, selectedBlockId, hoveredTarget } = useCustomizerStore.getState();
      if (selectedSectionId) {
        previewBridge.highlight(selectedSectionId, selectedBlockId ?? undefined);
      }
      if (hoveredTarget && useCustomizerStore.getState().inspectorMode) {
        previewBridge.hover(hoveredTarget.sectionId, hoveredTarget.blockId);
      }
      const css = buildLiveSettingsCss(useCustomizerStore.getState().themeSettings);
      previewBridge.updateSettings({ customCss: css });
    }

    iframe.addEventListener('load', syncPreviewState);
    iframe.srcdoc = previewHtml;
    initialLoadRef.current = false;

    return () => iframe.removeEventListener('load', syncPreviewState);
  }, [previewHtml]);

  useEffect(() => {
    if (selectedSectionId) {
      previewBridge.highlight(selectedSectionId, selectedBlockId ?? undefined);
    }
  }, [selectedSectionId, selectedBlockId, previewHtml]);

  useEffect(() => {
    if (inspectorMode && hoveredTarget) {
      previewBridge.hover(hoveredTarget.sectionId, hoveredTarget.blockId);
    } else {
      previewBridge.unhover();
    }
  }, [hoveredTarget, inspectorMode]);

  useEffect(() => {
    previewBridge.setInspectorMode(inspectorMode);
  }, [inspectorMode, previewHtml]);

  useEffect(() => {
    return () => {
      if (savedFlashRef.current) clearTimeout(savedFlashRef.current);
    };
  }, []);

  const deviceConfig = DEVICE_WIDTH[device] ?? DEVICE_WIDTH.desktop!;

  return (
    <div className="flex h-full items-start justify-center overflow-auto bg-zinc-200 rounded-lg">
      <div
        className="relative bg-white shadow-lg transition-[width,max-width] duration-200 ease-out"
        style={{
          width: typeof deviceConfig.width === 'number' ? deviceConfig.width : '100%',
          maxWidth: typeof deviceConfig.width === 'number' ? deviceConfig.width : '100%',
          minHeight: deviceConfig.minHeight,
          height: '100%',
        }}
      >
        {initialLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80">
            <Skeleton className="h-8 w-32" />
          </div>
        )}
        {page && themeId ? (
          <iframe
            ref={iframeRef}
            title="Theme preview"
            className="h-full w-full border-0"
            style={{ minHeight: deviceConfig.minHeight }}
            sandbox="allow-scripts allow-same-origin"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-zinc-500">
            Select a page to preview
          </div>
        )}
      </div>
    </div>
  );
}

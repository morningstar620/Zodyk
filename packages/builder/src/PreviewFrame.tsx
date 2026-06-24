'use client';

import { useEffect, useRef, useState } from 'react';
import { useCustomizerStore } from './store';

function injectPreviewHtml(iframe: HTMLIFrameElement, html: string): void {
  iframe.srcdoc = html;
}

export function PreviewFrame() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const {
    themeId,
    device,
    page,
    templateJson,
    themeSettings,
  } = useCustomizerStore();

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.data?.type === 'zodyk:section:select') {
        useCustomizerStore.getState().selectSection(event.data.sectionId);
      }
      if (event.data?.type === 'zodyk:preview:navigate' && event.data.pathname) {
        void (async () => {
          const state = useCustomizerStore.getState();
          const match = state.pageOptions.find((p) => p.pathname === event.data.pathname);
          if (!match || state.page?.id === match.id) return;
          const path = match.templatePath.replace(/^templates\//, '');
          const res = await fetch(`/api/v1/themes/${state.themeId}/templates/${path}`);
          if (!res.ok) return;
          const template = await res.json();
          state.setPage(match);
          state.setTemplateJson(template);
        })();
      }
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  useEffect(() => {
    if (!page || !themeId) {
      setPreviewHtml(null);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    const requestId = ++requestIdRef.current;

    debounceRef.current = setTimeout(async () => {
      try {
        const templatePath = page.templatePath.replace(/^templates\//, '');
        const res = await fetch(`/api/v1/themes/${themeId}/preview`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pathname: page.pathname,
            templatePath,
            templateJson,
            themeSettings,
          }),
        });
        if (!res.ok || requestId !== requestIdRef.current) return;
        const data = (await res.json()) as { html: string };
        setPreviewHtml(data.html);
      } catch {
        /* preview refresh failed */
      }
    }, 250);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [templateJson, themeSettings, page, themeId]);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe || !previewHtml) return;
    injectPreviewHtml(iframe, previewHtml);
  }, [previewHtml]);

  return (
    <div className="flex h-full items-start justify-center overflow-auto bg-zinc-200 p-4">
      <div
        className="h-full bg-white shadow-lg transition-[width,max-width] duration-200 ease-out"
        style={{
          width: device === 'mobile' ? 375 : '100%',
          maxWidth: device === 'mobile' ? 375 : '100%',
          minHeight: device === 'mobile' ? 667 : '100%',
        }}
      >
        {page && themeId ? (
          <iframe
            ref={iframeRef}
            title="Theme preview"
            className="h-full w-full border-0"
            style={{ minHeight: device === 'mobile' ? 667 : '100vh' }}
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

import type { RefObject } from 'react';

export type PreviewMessage =
  | { type: 'zodyk:section:select'; sectionId: string; blockId?: string }
  | { type: 'zodyk:section:highlight'; sectionId: string; blockId?: string }
  | { type: 'zodyk:section:hover'; sectionId: string; blockId?: string }
  | { type: 'zodyk:section:unhover' }
  | { type: 'zodyk:section:replace'; sectionId: string; html: string }
  | { type: 'zodyk:preview:navigate'; pathname: string }
  | { type: 'zodyk:preview:scroll'; x: number; y: number }
  | { type: 'zodyk:inspector:set'; enabled: boolean }
  | { type: 'zodyk:settings:update'; customCss?: string };

export class PreviewBridge {
  private iframeRef: RefObject<HTMLIFrameElement | null> | null = null;

  attach(ref: RefObject<HTMLIFrameElement | null>): void {
    this.iframeRef = ref;
  }

  detach(): void {
    this.iframeRef = null;
  }

  post(message: PreviewMessage): void {
    const iframe = this.iframeRef?.current;
    if (!iframe?.contentWindow) return;
    iframe.contentWindow.postMessage(message, '*');
  }

  highlight(sectionId: string, blockId?: string): void {
    this.post({ type: 'zodyk:section:highlight', sectionId, blockId });
  }

  hover(sectionId: string, blockId?: string): void {
    this.post({ type: 'zodyk:section:hover', sectionId, blockId });
  }

  unhover(): void {
    this.post({ type: 'zodyk:section:unhover' });
  }

  setInspectorMode(enabled: boolean): void {
    this.post({ type: 'zodyk:inspector:set', enabled });
  }

  replaceSection(sectionId: string, html: string): void {
    this.post({ type: 'zodyk:section:replace', sectionId, html });
  }

  updateSettings(settings: { customCss?: string }): void {
    this.post({ type: 'zodyk:settings:update', ...settings });
  }

  getScroll(): { x: number; y: number } | null {
    const iframe = this.iframeRef?.current;
    if (!iframe?.contentWindow) return null;
    try {
      return {
        x: iframe.contentWindow.scrollX,
        y: iframe.contentWindow.scrollY,
      };
    } catch {
      return null;
    }
  }
}

export const previewBridge = new PreviewBridge();

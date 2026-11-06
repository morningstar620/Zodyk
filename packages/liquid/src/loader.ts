import type { Liquid } from 'liquidjs';
import { escapeHtmlAttribute, safeAssetUrl } from './filters';

export interface ThemeFileMap {
  get(path: string): string | undefined;
  has(path: string): boolean;
  paths(): string[];
}

export function createThemeFileMap(files: Record<string, string>): ThemeFileMap {
  return {
    get: (path) => files[path],
    has: (path) => path in files,
    paths: () => Object.keys(files),
  };
}

export function registerThemeTags(engine: Liquid): void {
  engine.registerTag('stylesheet_tag', {
    parse(tagToken) {
      const match = /\s*'([^']+)'|\s*"([^"]+)"/.exec(tagToken.args);
      this.asset = match?.[1] ?? match?.[2] ?? '';
    },
    render(ctx, emitter) {
      void ctx;
      const url = safeAssetUrl(`/assets/${this.asset}`);
      if (url) emitter.write(`<link rel="stylesheet" href="${escapeHtmlAttribute(url)}">`);
    },
  });

  engine.registerTag('script_tag', {
    parse(tagToken) {
      const match = /\s*'([^']+)'|\s*"([^"]+)"/.exec(tagToken.args);
      this.asset = match?.[1] ?? match?.[2] ?? '';
    },
    render(ctx, emitter) {
      void ctx;
      const url = safeAssetUrl(`/assets/${this.asset}`);
      if (url) emitter.write(`<script src="${escapeHtmlAttribute(url)}" defer></script>`);
    },
  });
}

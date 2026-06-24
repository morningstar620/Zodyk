import type { Liquid } from 'liquidjs';

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
      const match = /\s*'([^']+)'|\"([^\"]+)\"/.exec(tagToken.args);
      this.asset = match?.[1] ?? match?.[2] ?? '';
    },
    render(ctx, emitter) {
      void ctx;
      emitter.write(`<link rel="stylesheet" href="/assets/${this.asset}">`);
    },
  });

  engine.registerTag('script_tag', {
    parse(tagToken) {
      const match = /\s*'([^']+)'|\"([^\"]+)\"/.exec(tagToken.args);
      this.asset = match?.[1] ?? match?.[2] ?? '';
    },
    render(ctx, emitter) {
      void ctx;
      emitter.write(`<script src="/assets/${this.asset}" defer></script>`);
    },
  });
}

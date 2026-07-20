export const SLOW_RENDER_MS = 200;

export interface RequestTimings {
  phases: Record<string, number>;
  mark(phase: string, startMs: number): void;
  finish(totalStartMs: number): Record<string, number>;
}

export function createRequestTimings(): RequestTimings {
  const phases: Record<string, number> = {};
  return {
    phases,
    mark(phase: string, startMs: number) {
      phases[phase] = performance.now() - startMs;
    },
    finish(totalStartMs: number) {
      phases.total = performance.now() - totalStartMs;
      return { ...phases };
    },
  };
}

export function formatServerTiming(timings: Record<string, number>): string {
  return Object.entries(timings)
    .map(([name, dur]) => `${name};dur=${Math.round(dur)}`)
    .join(', ');
}

export function logSlowRender(
  pathname: string,
  timings: Record<string, number>,
  meta?: Record<string, string | boolean | number>,
): void {
  const total = timings.total ?? 0;
  if (total < SLOW_RENDER_MS) return;
  if (process.env.NODE_ENV === 'production') return;

  console.warn('[storefront] slow render', {
    pathname,
    phases: Object.fromEntries(
      Object.entries(timings).map(([k, v]) => [k, Math.round(v)]),
    ),
    ...meta,
  });
}

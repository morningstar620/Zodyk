export const SLOW_REQUEST_MS = 500;

export interface RequestTimings {
  phases: Record<string, number>;
  mark(phase: string, startMs: number): void;
  finish(totalStartMs: number): Record<string, number>;
}

export interface ApiRequestLogEntry {
  requestId: string;
  method: string;
  path: string;
  status: number;
  durationMs: number;
  phases?: Record<string, number>;
  userId?: string;
  slow: boolean;
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

export function formatServerTiming(timings: Record<string, number>): HeadersInit {
  return {
    'Server-Timing': Object.entries(timings)
      .map(([name, dur]) => `${name};dur=${Math.round(dur)}`)
      .join(', '),
  };
}

export function logApiRequest(entry: ApiRequestLogEntry): void {
  const payload = {
    type: 'api_request',
    requestId: entry.requestId,
    method: entry.method,
    path: entry.path,
    status: entry.status,
    durationMs: Math.round(entry.durationMs),
    ...(entry.phases && Object.keys(entry.phases).length > 0
      ? { phases: Object.fromEntries(
          Object.entries(entry.phases).map(([k, v]) => [k, Math.round(v)]),
        ) }
      : {}),
    ...(entry.userId ? { userId: entry.userId } : {}),
    slow: entry.slow,
  };

  if (entry.slow) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[api] slow request', payload);
    } else {
      console.log(JSON.stringify(payload));
    }
  } else if (process.env.NODE_ENV === 'production') {
    console.log(JSON.stringify(payload));
  }
}

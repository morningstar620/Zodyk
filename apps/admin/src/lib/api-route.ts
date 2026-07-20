import {
  getApiSession,
  handleApiError,
  logApiRequest,
  formatServerTiming,
  SLOW_REQUEST_MS,
} from '@zodyk/api';
import type { AuthSession } from '@zodyk/auth';

type RouteContext = { params: Promise<Record<string, string>> };

export type ApiRouteResult =
  | unknown
  | Response
  | {
      result: unknown;
      serverTiming?: HeadersInit;
      phases?: Record<string, number>;
      status?: number;
    };

export type ApiRouteHandler = (
  request: Request,
  context: RouteContext,
  session: AuthSession | null,
) => Promise<ApiRouteResult>;

function normalizeResult(raw: ApiRouteResult): {
  result: unknown;
  serverTiming?: HeadersInit;
  phases?: Record<string, number>;
  status: number;
} {
  if (
    raw !== null &&
    typeof raw === 'object' &&
    'result' in raw &&
    !('arrayBuffer' in raw)
  ) {
    const typed = raw as {
      result: unknown;
      serverTiming?: HeadersInit;
      phases?: Record<string, number>;
      status?: number;
    };
    return {
      result: typed.result,
      serverTiming: typed.serverTiming,
      phases: typed.phases,
      status: typed.status ?? 200,
    };
  }
  return { result: raw, status: 200 };
}

function buildResponseHeaders(
  requestId: string,
  durationMs: number,
  serverTiming?: HeadersInit,
): Headers {
  const headers = new Headers(serverTiming ?? {});
  headers.set('x-request-id', requestId);
  if (!headers.has('Server-Timing')) {
    headers.set('Server-Timing', `total;dur=${Math.round(durationMs)}`);
  }
  return headers;
}

export function apiRoute(handler: ApiRouteHandler) {
  return async (request: Request, context: RouteContext): Promise<Response> => {
    const requestId = request.headers.get('x-request-id') ?? crypto.randomUUID();
    const url = new URL(request.url);
    const start = performance.now();
    let status = 500;
    let phases: Record<string, number> | undefined;
    let userId: string | undefined;

    try {
      const session = await getApiSession(request);
      userId = session?.userId;
      const raw = await handler(request, context, session);

      if (raw instanceof Response) {
        status = raw.status;
        const headers = new Headers(raw.headers);
        headers.set('x-request-id', requestId);
        const durationMs = performance.now() - start;
        if (!headers.has('Server-Timing')) {
          headers.set('Server-Timing', `total;dur=${Math.round(durationMs)}`);
        }
        return new Response(raw.body, { status, headers });
      }

      const { result, serverTiming, phases: handlerPhases, status: resultStatus } =
        normalizeResult(raw);
      phases = handlerPhases;
      status = resultStatus;
      const durationMs = performance.now() - start;

      return Response.json(result, {
        status,
        headers: buildResponseHeaders(requestId, durationMs, serverTiming),
      });
    } catch (error) {
      const response = handleApiError(error);
      status = response.status;
      const headers = new Headers(response.headers);
      headers.set('x-request-id', requestId);
      const durationMs = performance.now() - start;
      if (!headers.has('Server-Timing')) {
        headers.set('Server-Timing', `total;dur=${Math.round(durationMs)}`);
      }
      return new Response(response.body, { status, headers });
    } finally {
      const durationMs = performance.now() - start;
      logApiRequest({
        requestId,
        method: request.method,
        path: url.pathname,
        status,
        durationMs,
        phases,
        userId,
        slow: durationMs > SLOW_REQUEST_MS,
      });
    }
  };
}

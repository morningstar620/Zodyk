import {
  AuthError,
  resolveSessionFromHeaders,
  type AuthSession,
} from '@zodyk/auth';
import { z } from '@zodyk/core';
import { handlePaymentsError } from './payments/handlers';

/** Framework-agnostic session resolution (Bearer token or Auth.js JWT cookie). */
export async function getApiSession(request: Request): Promise<AuthSession | null> {
  return resolveSessionFromHeaders(request.headers);
}

export function handleApiError(error: unknown): Response {
  const paymentsResponse = handlePaymentsError(error);
  if (paymentsResponse) return paymentsResponse;

  if (error instanceof AuthError) {
    return Response.json({ error: error.message }, { status: error.status });
  }
  if (error instanceof z.ZodError) {
    return Response.json({ error: 'Validation failed', details: error.flatten() }, { status: 400 });
  }
  if (error instanceof Error && 'code' in error && error.code === 'MEDIA_NOT_CONFIGURED') {
    return Response.json({ error: error.message, code: error.code }, { status: 503 });
  }
  if (error instanceof Error) {
    return Response.json({ error: error.message }, { status: 400 });
  }
  console.error(error);
  return Response.json({ error: 'Internal server error' }, { status: 500 });
}

export function getClientIp(request: Request): string | undefined {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    undefined
  );
}

export * from './request-log';

export * from './users/handlers';
export * from './roles/handlers';
export * from './api-tokens/handlers';
export * from './audit-logs/handlers';
export * from './meta-objects/handlers';
export * from './meta-entries/handlers';
export * from './system-entities/handlers';
export * from './pages/handlers';
export * from './menus/handlers';
export * from './themes/handlers';
export * from './storage/handlers';

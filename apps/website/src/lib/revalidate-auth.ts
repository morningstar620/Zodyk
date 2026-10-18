import { createHash, timingSafeEqual } from 'node:crypto';

export type RevalidateDecision =
  | { ok: true }
  | { ok: false; status: 401 | 503; error: string };

/**
 * Production always requires REVALIDATE_SECRET.
 * Other environments stay open only when the secret is unset, so local
 * publish still flushes the cache before the secret is configured.
 */
export function authorizeRevalidate(input: {
  authorization: string | null;
  secret: string | undefined;
  nodeEnv: string | undefined;
}): RevalidateDecision {
  const secret = input.secret?.trim() ?? '';
  if (!secret) {
    if (input.nodeEnv === 'production') {
      return {
        ok: false,
        status: 503,
        error: 'Revalidate secret is not configured',
      };
    }
    return { ok: true };
  }

  if (!bearerMatches(input.authorization, secret)) {
    return { ok: false, status: 401, error: 'Unauthorized' };
  }
  return { ok: true };
}

function bearerMatches(authorization: string | null, secret: string): boolean {
  const presented = authorization?.startsWith('Bearer ')
    ? authorization.slice('Bearer '.length)
    : '';
  const presentedHash = createHash('sha256').update(presented).digest();
  const secretHash = createHash('sha256').update(secret).digest();
  return timingSafeEqual(presentedHash, secretHash);
}

import { createHmac, timingSafeEqual } from 'node:crypto';

/** Short-lived storefront design-mode grant. HMAC-SHA256 with AUTH_SECRET. */
export const DESIGN_PREVIEW_TTL_MS = 15 * 60 * 1000;

export interface StorefrontAccessInput {
  previewParam: string | null;
  previewSignature: string | null;
  previewThemeId: string | null;
  previewToken: string | null;
  cookieTheme: string | null;
  cookieToken: string | null;
  adminSession: boolean;
  signingSecret: string | undefined;
  nowMs?: number;
}

export interface StorefrontAccess {
  designMode: boolean;
  previewThemeId?: string;
  previewToken?: string;
  isPreview: boolean;
}

export function signDesignPreviewToken(
  secret: string,
  nowMs = Date.now(),
  ttlMs = DESIGN_PREVIEW_TTL_MS,
): string {
  const payload = Buffer.from(
    JSON.stringify({ v: 1, exp: nowMs + ttlMs }),
    'utf8',
  ).toString('base64url');
  const signature = createHmac('sha256', secret).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

export function verifyDesignPreviewToken(
  token: string | null | undefined,
  secret: string | undefined,
  nowMs = Date.now(),
): boolean {
  const trimmedSecret = secret?.trim();
  if (!token || !trimmedSecret) return false;

  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const payload = parts[0];
  const signature = parts[1];
  if (!payload || !signature) return false;

  const expected = createHmac('sha256', trimmedSecret).update(payload).digest('base64url');
  const signatureBytes = Buffer.from(signature);
  const expectedBytes = Buffer.from(expected);
  if (
    signatureBytes.length !== expectedBytes.length ||
    !timingSafeEqual(signatureBytes, expectedBytes)
  ) {
    return false;
  }

  try {
    const parsed: unknown = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!parsed || typeof parsed !== 'object') return false;
    const version = (parsed as { v?: unknown }).v;
    const exp = (parsed as { exp?: unknown }).exp;
    if (version !== 1 || typeof exp !== 'number' || !Number.isFinite(exp)) return false;
    return exp > nowMs;
  } catch {
    return false;
  }
}

/**
 * `?preview=1` requests design mode. Anonymous visitors do not get it.
 * A valid signed preview token or an admin session is required.
 * Theme preview (draft theme via preview token) is unchanged.
 */
export function resolveStorefrontAccess(input: StorefrontAccessInput): StorefrontAccess {
  const previewThemeId = input.previewThemeId ?? undefined;
  const previewToken = input.previewToken ?? undefined;
  const hasQueryPreview = Boolean(previewThemeId && previewToken);
  const hasCookiePreview = Boolean(input.cookieTheme && input.cookieToken);
  const signed = verifyDesignPreviewToken(
    input.previewSignature,
    input.signingSecret,
    input.nowMs,
  );
  const designMode = input.previewParam === '1' && (signed || input.adminSession);

  return {
    designMode,
    previewThemeId,
    previewToken,
    isPreview: designMode || hasQueryPreview || hasCookiePreview,
  };
}

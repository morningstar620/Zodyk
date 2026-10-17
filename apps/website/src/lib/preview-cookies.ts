/** Draft-theme preview cookies. Short enough that a leaked URL is not a long-lived grant. */
export const PREVIEW_COOKIE_MAX_AGE_SECONDS = 15 * 60;

const PREVIEW_PARAM_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;

export function isSafePreviewParam(value: string): boolean {
  return PREVIEW_PARAM_PATTERN.test(value);
}

export function previewCookieOptions(nodeEnv: string | undefined) {
  return {
    httpOnly: true as const,
    sameSite: 'lax' as const,
    path: '/',
    maxAge: PREVIEW_COOKIE_MAX_AGE_SECONDS,
    secure: nodeEnv === 'production',
  };
}

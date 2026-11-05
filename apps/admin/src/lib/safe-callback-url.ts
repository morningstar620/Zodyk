const FALLBACK_PATH = '/';

/**
 * Restrict post-login navigation to this origin.
 *
 * Accepts only absolute-path references such as `/pages` or `/?tab=1`.
 * Protocol-relative (`//evil.example`), scheme URLs, and backslash variants
 * that browsers normalize into another origin all fall back to `/`.
 */
export function safeCallbackUrl(
  raw: string | null | undefined,
  fallback = FALLBACK_PATH,
): string {
  if (!raw || !raw.startsWith('/')) {
    return fallback;
  }

  let url: URL;
  try {
    url = new URL(raw, 'http://admin.invalid');
  } catch {
    return fallback;
  }

  // URL parsing turns `//host`, `///host`, and `/\host` into another origin.
  if (url.origin !== 'http://admin.invalid') {
    return fallback;
  }

  return `${url.pathname}${url.search}${url.hash}`;
}

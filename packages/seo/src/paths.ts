/** Origin (and optional base path) used to build absolute public URLs. */
export function sanitizeSiteUrl(input: string | undefined | null): string {
  const fallback = 'http://localhost:5003';
  if (!input) return fallback;
  try {
    const url = new URL(input.trim());
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return fallback;
    const path = url.pathname.replace(/\/$/, '');
    return path && path !== '/' ? `${url.origin}${path}` : url.origin;
  } catch {
    return fallback;
  }
}

export function absoluteUrl(siteUrl: string, path: string): string {
  const base = sanitizeSiteUrl(siteUrl);
  const normalized = path.startsWith('/') ? path : `/${path}`;
  if (normalized === '/') return `${base}/`;
  return `${base}${normalized}`;
}

export function pagePublicPath(slug: string): string {
  return `/${encodeURIComponent(slug)}`;
}

export function joinPublicPath(path: string): string {
  const trimmed = path.trim();
  if (!trimmed) return '/';
  const withSlash = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return withSlash.replace(/\/{2,}/g, '/');
}

/** Public path for a meta entry single route, defaulting to `/{slug}/{handle}`. */
export function metaEntryPublicPath(
  singlePath: string | undefined,
  definitionSlug: string,
  handle: string,
): string {
  const pattern = (singlePath && singlePath.trim()) || `${definitionSlug}/:handle`;
  const encodedHandle = encodeURIComponent(handle);
  const replaced = pattern.replaceAll(':handle', encodedHandle);
  return joinPublicPath(replaced);
}

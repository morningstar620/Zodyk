/**
 * Theme assets are only safe for shared caches when they came from the live
 * theme. A preview render can be triggered by cookies as well as query params,
 * so the caller must pass whether a preview theme was actually selected.
 */
export function themeAssetCacheControl(isPreview: boolean): string {
  return isPreview ? 'private, no-store' : 'public, max-age=3600';
}

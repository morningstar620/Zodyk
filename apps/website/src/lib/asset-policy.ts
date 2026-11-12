/**
 * Response policy for theme assets served from the storefront origin.
 *
 * Theme authors, and editors with `themes:update`, can write arbitrary files
 * under `assets/`. Some types are active content when opened as a document:
 * an uploaded `.svg`, `.html`, or `.xml` would otherwise run author-supplied
 * script in the storefront origin. The policy below keeps legitimate
 * `<img src="*.svg">` use working while making every other request inert.
 *
 * Layered on purpose; no single header is trusted on its own:
 * - `X-Content-Type-Options: nosniff` stops browsers from reinterpreting a
 *   file as HTML.
 * - A sandboxed CSP blocks script if a document is rendered anyway.
 * - `Content-Disposition: attachment` turns a navigation into a download.
 * - SVG, HTML, and XML are served as `text/plain` for every request that is
 *   not an image load, so there is no document to execute even if a browser
 *   ignores CSP or `Content-Disposition`.
 *
 * Verified in Chromium: an SVG with `Content-Disposition: attachment` still
 * renders in `<img>` (the header is ignored for image subresources). A
 * navigation to the same headers downloads instead of executing, and a
 * client that sends no `Sec-Fetch-Dest` either downloads or renders with
 * script blocked by the sandbox.
 */
export const ACTIVE_ASSET_CSP = "default-src 'none'; style-src 'unsafe-inline'; sandbox";

const HTML_TYPES = new Set(['text/html', 'application/xhtml+xml']);
const XML_TYPES = new Set(['application/xml', 'text/xml']);

export interface ThemeAssetHeaderOptions {
  /** Cache policy chosen by the caller (live vs preview theme). */
  cacheControl?: string;
  /** `Sec-Fetch-Dest` of the request, when the browser sent one. */
  dest?: string | null;
  /** File name used for the attachment header. */
  filename?: string;
}

function normalizeType(contentType: string): string {
  return contentType.split(';')[0]!.trim().toLowerCase();
}

function attachmentName(filename: string | undefined): string {
  const base = (filename ?? 'asset').split('/').pop() ?? 'asset';
  // Keep the header ASCII and free of quoting hazards.
  const safe = base.replace(/[^A-Za-z0-9._-]/g, '_').replace(/^[._]+/, '');
  return safe || 'asset';
}

function inert(headers: Record<string, string>, filename: string | undefined): Record<string, string> {
  headers['Content-Type'] = 'text/plain; charset=utf-8';
  headers['Content-Disposition'] = `attachment; filename="${attachmentName(filename)}"`;
  headers['Content-Security-Policy'] = ACTIVE_ASSET_CSP;
  // A downgraded document must not be cached as if it were the asset.
  headers['Cache-Control'] = 'private, no-store';
  return headers;
}

/**
 * Headers for a theme asset response.
 *
 * `image/svg+xml` keeps its type only for `Sec-Fetch-Dest: image` so that
 * `<img>` still renders. Every other request for an active type is served as
 * `text/plain` with an attachment disposition.
 */
export function themeAssetHeaders(
  contentType: string,
  options: ThemeAssetHeaderOptions = {},
): Record<string, string> {
  const type = normalizeType(contentType) || 'application/octet-stream';
  const cacheControl = options.cacheControl ?? 'public, max-age=3600';
  const headers: Record<string, string> = {
    'Content-Type': type,
    'Cache-Control': cacheControl,
    'X-Content-Type-Options': 'nosniff',
  };

  if (HTML_TYPES.has(type) || XML_TYPES.has(type)) {
    return inert(headers, options.filename);
  }

  if (type === 'image/svg+xml') {
    headers['Content-Security-Policy'] = ACTIVE_ASSET_CSP;
    // The response differs by request destination; keep caches from mixing them.
    headers['Vary'] = 'Sec-Fetch-Dest';

    if (options.dest === 'image') {
      return headers;
    }

    if (options.dest === null || options.dest === undefined || options.dest === '') {
      // Legacy client that sends no Sec-Fetch-Dest. Keep the image type so old
      // browsers can still render <img>, and rely on the sandboxed CSP plus the
      // attachment disposition for navigation.
      headers['Content-Disposition'] = `attachment; filename="${attachmentName(options.filename)}"`;
      headers['Cache-Control'] = 'private, no-store';
      return headers;
    }

    return inert(headers, options.filename);
  }

  if (type === 'application/pdf') {
    // A PDF can carry JavaScript for its viewer. Theme PDFs are downloads, so
    // never open one inline from the storefront origin.
    headers['Content-Disposition'] = `attachment; filename="${attachmentName(options.filename)}"`;
    headers['Cache-Control'] = 'private, no-store';
    return headers;
  }

  return headers;
}

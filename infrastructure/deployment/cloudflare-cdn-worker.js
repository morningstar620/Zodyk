/**
 * Cloudflare Worker — public CDN gate for Zodyk R2 (same bucket).
 *
 * Allows:  default/media/*
 * Denies:   default/themes/* (and everything else)
 *
 * Wrangler binding (Settings → Bindings → R2 bucket):
 *   Variable name: ZODYK_BUCKET
 */

function contentTypeForKey(key) {
  if (key.endsWith('.webp')) return 'image/webp';
  if (key.endsWith('.avif')) return 'image/avif';
  if (key.endsWith('.jpg') || key.endsWith('.jpeg')) return 'image/jpeg';
  if (key.endsWith('.png')) return 'image/png';
  if (key.endsWith('.gif')) return 'image/gif';
  if (key.endsWith('.svg')) return 'image/svg+xml';
  if (key.endsWith('.css')) return 'text/css';
  if (key.endsWith('.js')) return 'application/javascript';
  if (key.endsWith('.json')) return 'application/json';
  return 'application/octet-stream';
}

export default {
  async fetch(request, env) {
    try {
      if (!env.ZODYK_BUCKET) {
        return new Response(
          'Misconfigured worker: R2 binding ZODYK_BUCKET is missing. Add it in Worker → Settings → Bindings.',
          { status: 500 },
        );
      }

      if (request.method !== 'GET' && request.method !== 'HEAD') {
        return new Response('Method not allowed', { status: 405 });
      }

      const url = new URL(request.url);
      const key = decodeURIComponent(url.pathname.replace(/^\/+/, ''));
      if (!key) {
        return new Response('Not found', { status: 404 });
      }

      const isMedia = key.startsWith('default/media/');
      if (!isMedia) {
        return new Response('Forbidden', { status: 403 });
      }

      const object = await env.ZODYK_BUCKET.get(key);
      if (!object) {
        return new Response('Not found', { status: 404 });
      }

      const headers = new Headers();
      if (object.httpMetadata) {
        object.writeHttpMetadata(headers);
      }
      if (!headers.has('Content-Type')) {
        headers.set('Content-Type', contentTypeForKey(key));
      }
      headers.set('Cache-Control', 'public, max-age=31536000, immutable');
      if (object.httpEtag) {
        headers.set('ETag', object.httpEtag);
      }

      if (request.method === 'HEAD') {
        return new Response(null, { status: 200, headers });
      }

      return new Response(object.body, { status: 200, headers });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown worker error';
      return new Response(`Worker error: ${message}`, { status: 500 });
    }
  },
};

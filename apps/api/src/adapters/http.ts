import type { Request as ExpressRequest, Response as ExpressResponse } from 'express';

/**
 * Convert an Express request into a Web Fetch API Request.
 * Expects the raw body middleware to leave `req.body` as a Buffer (or empty).
 */
export function toWebRequest(req: ExpressRequest): Request {
  const host = req.get('host') ?? 'localhost';
  const protocol = req.protocol || 'http';
  const url = `${protocol}://${host}${req.originalUrl}`;

  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      for (const entry of value) headers.append(key, entry);
    } else {
      headers.set(key, value);
    }
  }

  const init: RequestInit = {
    method: req.method,
    headers,
  };

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    const body = req.body;
    if (Buffer.isBuffer(body) && body.length > 0) {
      init.body = new Uint8Array(body);
    } else if (typeof body === 'string' && body.length > 0) {
      init.body = body;
    } else if (body && typeof body === 'object' && !Buffer.isBuffer(body)) {
      // Fallback if a JSON parser ran unexpectedly.
      init.body = JSON.stringify(body);
      if (!headers.has('content-type')) {
        headers.set('content-type', 'application/json');
      }
    }
  }

  return new Request(url, init);
}

/** Pipe a Web Fetch Response into an Express response. */
export async function sendWebResponse(
  res: ExpressResponse,
  response: Response,
): Promise<void> {
  res.status(response.status);

  response.headers.forEach((value, key) => {
    // Express manages content-length when piping/sending a body.
    if (key.toLowerCase() === 'content-length') return;
    res.setHeader(key, value);
  });

  if (response.status === 204 || response.status === 304) {
    res.end();
    return;
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  res.send(buffer);
}

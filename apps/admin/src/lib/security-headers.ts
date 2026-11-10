export type SecurityHeader = { key: string; value: string };

/**
 * Baseline response headers for the admin app. Scripts and styles keep
 * 'unsafe-inline' because Next.js injects inline bootstrap markup; a nonce
 * based CSP is a separate follow-up.
 */
export function securityHeaders(options: { isDev?: boolean } = {}): SecurityHeader[] {
  const isDev = options.isDev ?? process.env.NODE_ENV !== 'production';
  const scriptSrc = ["'self'", "'unsafe-inline'", isDev ? "'unsafe-eval'" : undefined]
    .filter(Boolean)
    .join(' ');
  const connectSrc = [
    "'self'",
    'https:',
    'wss:',
    isDev ? 'http:' : undefined,
    isDev ? 'ws:' : undefined,
  ]
    .filter(Boolean)
    .join(' ');

  const csp = [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    `connect-src ${connectSrc}`,
    "media-src 'self' https: blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join('; ');

  return [
    { key: 'Content-Security-Policy', value: csp },
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    { key: 'X-Frame-Options', value: 'DENY' },
    { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
    // Only send HSTS over HTTPS deployments; it would poison localhost otherwise.
    ...(isDev
      ? []
      : [
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains',
          },
        ]),
  ];
}

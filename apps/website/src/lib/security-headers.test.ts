import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { securityHeaders } from './security-headers';

function header(headers: ReturnType<typeof securityHeaders>, key: string): string {
  return headers.find((item) => item.key === key)?.value ?? '';
}

describe('storefront security headers', () => {
  it('sets a CSP with a locked-down default and frame policy', () => {
    const csp = header(securityHeaders({ isDev: false }), 'Content-Security-Policy');

    assert.match(csp, /default-src 'self'/);
    assert.match(csp, /frame-ancestors 'none'/);
    assert.match(csp, /object-src 'none'/);
    assert.match(csp, /base-uri 'self'/);
    assert.match(csp, /form-action 'self'/);
  });

  it('does not allow eval in production', () => {
    const csp = header(securityHeaders({ isDev: false }), 'Content-Security-Policy');
    assert.doesNotMatch(csp, /'unsafe-eval'/);
  });

  it('sets the supporting hardening headers', () => {
    const headers = securityHeaders({ isDev: false });

    assert.equal(header(headers, 'X-Content-Type-Options'), 'nosniff');
    assert.equal(header(headers, 'Referrer-Policy'), 'strict-origin-when-cross-origin');
    assert.equal(header(headers, 'X-Frame-Options'), 'DENY');
    assert.match(header(headers, 'Permissions-Policy'), /camera=\(\)/);
  });

  it('only sends HSTS outside development', () => {
    assert.match(
      header(securityHeaders({ isDev: false }), 'Strict-Transport-Security'),
      /max-age=63072000/,
    );
    assert.equal(header(securityHeaders({ isDev: true }), 'Strict-Transport-Security'), '');
  });
});

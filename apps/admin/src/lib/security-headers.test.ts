import { describe, expect, it } from 'vitest';
import { securityHeaders } from './security-headers';

function header(headers: ReturnType<typeof securityHeaders>, key: string): string {
  return headers.find((item) => item.key === key)?.value ?? '';
}

describe('securityHeaders', () => {
  it('sets a CSP with a locked-down default and frame policy', () => {
    const headers = securityHeaders({ isDev: false });
    const csp = header(headers, 'Content-Security-Policy');

    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("base-uri 'self'");
    expect(csp).toContain("form-action 'self'");
  });

  it('does not allow eval in production', () => {
    const csp = header(securityHeaders({ isDev: false }), 'Content-Security-Policy');
    expect(csp).not.toContain("'unsafe-eval'");
  });

  it('allows eval and local websockets in development', () => {
    const csp = header(securityHeaders({ isDev: true }), 'Content-Security-Policy');
    expect(csp).toContain("'unsafe-eval'");
    expect(csp).toContain('ws:');
  });

  it('sets the supporting hardening headers', () => {
    const headers = securityHeaders({ isDev: false });

    expect(header(headers, 'X-Content-Type-Options')).toBe('nosniff');
    expect(header(headers, 'Referrer-Policy')).toBe('strict-origin-when-cross-origin');
    expect(header(headers, 'X-Frame-Options')).toBe('DENY');
    expect(header(headers, 'Permissions-Policy')).toContain('camera=()');
  });

  it('only sends HSTS outside development', () => {
    expect(header(securityHeaders({ isDev: false }), 'Strict-Transport-Security')).toContain(
      'max-age=63072000',
    );
    expect(header(securityHeaders({ isDev: true }), 'Strict-Transport-Security')).toBe('');
  });
});

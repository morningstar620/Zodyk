import { describe, expect, it } from 'vitest';
import { formatAuditAction, formatRelativeTime } from './audit-log-format';

describe('audit log formatting', () => {
  it('turns an action key into readable text', () => {
    expect(formatAuditAction('page.publish')).toBe('Page Publish');
    expect(formatAuditAction('theme_file:update')).toBe('Theme File Update');
  });

  it('formats relative times', () => {
    const now = Date.parse('2026-11-09T12:00:00.000Z');

    expect(formatRelativeTime('2026-11-09T11:59:30.000Z', now)).toBe('just now');
    expect(formatRelativeTime('2026-11-09T11:45:00.000Z', now)).toBe('15m ago');
    expect(formatRelativeTime('2026-11-09T09:00:00.000Z', now)).toBe('3h ago');
    expect(formatRelativeTime('2026-11-07T12:00:00.000Z', now)).toBe('2d ago');
  });

  it('ignores an invalid timestamp', () => {
    expect(formatRelativeTime('not-a-date')).toBe('');
  });
});

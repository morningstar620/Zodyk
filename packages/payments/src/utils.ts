import { createHmac, timingSafeEqual } from 'node:crypto';

export function maskSecret(value: string, visible = 4): string {
  if (!value) return '';
  if (value.length <= visible) return '*'.repeat(value.length);
  return `${'*'.repeat(Math.max(0, value.length - visible))}${value.slice(-visible)}`;
}

export function headerValue(
  headers: Headers | Record<string, string | string[] | undefined>,
  name: string,
): string | undefined {
  const lower = name.toLowerCase();
  if (typeof (headers as Headers).get === 'function') {
    return (headers as Headers).get(name) ?? (headers as Headers).get(lower) ?? undefined;
  }
  const record = headers as Record<string, string | string[] | undefined>;
  const raw = record[name] ?? record[lower];
  if (Array.isArray(raw)) return raw[0];
  return raw;
}

export function verifyHmacSha256(
  payload: string,
  secret: string,
  signature: string,
  encoding: 'hex' | 'base64' = 'hex',
): boolean {
  const expected = createHmac('sha256', secret).update(payload).digest(encoding);
  try {
    const a = Buffer.from(expected);
    const b = Buffer.from(signature);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function isObjectId(value: string | undefined | null): value is string {
  return typeof value === 'string' && /^[a-fA-F0-9]{24}$/.test(value);
}

export function metadataToRecord(
  metadata?: Record<string, string> | Map<string, string> | null,
): Record<string, string> {
  if (!metadata) return {};
  if (metadata instanceof Map) {
    return Object.fromEntries(metadata.entries());
  }
  return { ...metadata };
}

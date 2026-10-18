import { z } from 'zod';

export const REDIRECT_STATUS_CODES = [301, 302] as const;
export type RedirectStatusCode = (typeof REDIRECT_STATUS_CODES)[number];

export interface RedirectRule {
  fromPath: string;
  toPath: string;
  statusCode: RedirectStatusCode;
  enabled?: boolean;
}

export interface ResolvedRedirect {
  location: string;
  statusCode: RedirectStatusCode;
}

/** Collapse duplicate slashes and a trailing slash so `/old/` matches `/old`. */
export function normalizeRedirectPath(input: string): string {
  let path = input.trim();
  if (!path.startsWith('/')) path = `/${path}`;
  path = path.replace(/\/{2,}/g, '/');
  if (path.length > 1 && path.endsWith('/')) path = path.slice(0, -1);
  return path || '/';
}

export function isSafeRedirectSource(input: string): boolean {
  const trimmed = input.trim();
  if (!trimmed.startsWith('/')) return false;
  if (trimmed.startsWith('//')) return false;
  if (/[?#\\\s]/.test(trimmed)) return false;
  if (trimmed.includes('..')) return false;
  return trimmed.length <= 500;
}

export function isSafeRedirectDestination(input: string): boolean {
  const trimmed = input.trim();
  if (!trimmed || trimmed.length > 2000) return false;
  if (/[\s\\]/.test(trimmed)) return false;
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
    return !trimmed.includes('..');
  }
  try {
    const url = new URL(trimmed);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

const statusSchema = z.union([z.literal(301), z.literal(302)]);

export const redirectSchema = z.object({
  fromPath: z
    .string()
    .trim()
    .refine(isSafeRedirectSource, 'From path must be a site path starting with /'),
  toPath: z
    .string()
    .trim()
    .refine(isSafeRedirectDestination, 'Destination must be a site path or http(s) URL'),
  statusCode: z.preprocess((value) => {
    if (value === '301' || value === 301) return 301;
    if (value === '302' || value === 302) return 302;
    return value;
  }, statusSchema),
  enabled: z.boolean().optional(),
});

export const updateRedirectSchema = redirectSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, 'At least one field is required');

export const robotsTxtSchema = z.object({
  robotsTxt: z.string().max(20_000),
});

export type RedirectInput = z.infer<typeof redirectSchema>;
export type UpdateRedirectInput = z.infer<typeof updateRedirectSchema>;

export function resolveRedirect(pathname: string, rules: RedirectRule[]): ResolvedRedirect | null {
  const from = normalizeRedirectPath(pathname);
  const rule = rules.find(
    (candidate) =>
      candidate.enabled !== false && normalizeRedirectPath(candidate.fromPath) === from,
  );
  if (!rule) return null;
  if (!isSafeRedirectDestination(rule.toPath)) return null;
  if (rule.statusCode !== 301 && rule.statusCode !== 302) return null;

  const location = /^https?:\/\//i.test(rule.toPath.trim())
    ? rule.toPath.trim()
    : normalizeRedirectPath(rule.toPath);
  if (location === from) return null;
  return { location, statusCode: rule.statusCode };
}

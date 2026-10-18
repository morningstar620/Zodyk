/**
 * Browser Origin allow-list for credentialed API requests.
 * Requests with no Origin (curl, server-to-server) are always allowed.
 * An empty allow-list allows every origin only outside production.
 */
export function isCorsOriginAllowed(input: {
  origin: string | undefined;
  allowedOrigins: readonly string[];
  nodeEnv: string | undefined;
}): boolean {
  if (!input.origin) return true;
  if (input.allowedOrigins.includes(input.origin)) return true;
  return input.allowedOrigins.length === 0 && input.nodeEnv !== 'production';
}

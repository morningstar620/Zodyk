const trustedClientIps = new WeakMap<Request, string>();

export function setTrustedClientIp(
  request: Request,
  ip: string | undefined,
): void {
  if (ip) {
    trustedClientIps.set(request, ip);
  }
}

export function getClientIp(request: Request): string | undefined {
  return trustedClientIps.get(request);
}
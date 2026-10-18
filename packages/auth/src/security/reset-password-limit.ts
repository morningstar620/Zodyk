import { AuthError } from '../rbac/middleware';
import { hashToken } from './encryption';
import { checkRateLimit, getRateLimitKey } from './rate-limit';

/** Limit reset attempts by client IP and by reset token (stored only as a hash). */
export async function assertResetPasswordRateLimit(ip: string, token: string): Promise<void> {
  const normalizedIp = ip.trim() || 'unknown';
  const [ipResult, tokenResult] = await Promise.all([
    checkRateLimit(getRateLimitKey('reset-password:ip', normalizedIp)),
    checkRateLimit(getRateLimitKey('reset-password:token', hashToken(token))),
  ]);

  if (!ipResult.success || !tokenResult.success) {
    throw new AuthError('Too many requests', 429);
  }
}

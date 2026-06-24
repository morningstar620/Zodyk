import {
  checkRateLimit,
  completeMfaLogin,
  getRateLimitKey,
} from '@zodyk/auth';
import { mfaVerifySchema } from '@zodyk/core';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const input = mfaVerifySchema.parse(body);

    const rateLimit = await checkRateLimit(getRateLimitKey('mfa', input.code));
    if (!rateLimit.success) {
      return Response.json({ error: 'Too many requests' }, { status: 429 });
    }

    if (!input.userId) {
      return Response.json({ error: 'MFA token required' }, { status: 400 });
    }

    const user = await completeMfaLogin(input.userId, input.code);
    if (!user) {
      return Response.json({ error: 'Invalid code' }, { status: 401 });
    }

    return Response.json({ success: true, userId: user.userId });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'MFA verification failed';
    return Response.json({ error: message }, { status: 400 });
  }
}

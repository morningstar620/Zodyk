import {
  checkRateLimit,
  getRateLimitKey,
  registerUser,
  requestPasswordReset,
  resetPassword,
} from '@zodyk/auth';
import { forgotPasswordSchema, registerSchema, resetPasswordSchema } from '@zodyk/core';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const action = body.action as string;

    if (action === 'register') {
      if (process.env.ALLOW_REGISTRATION !== 'true') {
        return Response.json({ error: 'Registration is disabled' }, { status: 403 });
      }
      const input = registerSchema.parse(body);
      const ip = request.headers.get('x-forwarded-for') ?? 'unknown';
      const rateLimit = await checkRateLimit(getRateLimitKey('register', ip));
      if (!rateLimit.success) {
        return Response.json({ error: 'Too many requests' }, { status: 429 });
      }
      const user = await registerUser(input);
      return Response.json(user, { status: 201 });
    }

    if (action === 'forgot-password') {
      const input = forgotPasswordSchema.parse(body);
      const rateLimit = await checkRateLimit(getRateLimitKey('forgot-password', input.email));
      if (!rateLimit.success) {
        return Response.json({ error: 'Too many requests' }, { status: 429 });
      }
      await requestPasswordReset(input.email);
      return Response.json({ success: true });
    }

    if (action === 'reset-password') {
      const input = resetPasswordSchema.parse(body);
      await resetPassword(input.token, input.password);
      return Response.json({ success: true });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Request failed';
    return Response.json({ error: message }, { status: 400 });
  }
}

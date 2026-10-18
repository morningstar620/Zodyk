import {
  AuthError,
  auth,
  disableMfa,
  enableMfa,
  generateMfaQrCode,
  generateMfaSecret,
} from '@zodyk/auth';
import { mfaSetupSchema } from '@zodyk/core';

export async function GET() {
  const session = await auth();
  if (!session?.userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const secret = generateMfaSecret();
  const qrCode = await generateMfaQrCode(session.user.email ?? '', secret);

  return Response.json({ secret, qrCode });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();

    if (body.action === 'enable') {
      const input = mfaSetupSchema.parse(body);
      const result = await enableMfa(session.userId, input.secret, input.code);
      return Response.json(result);
    }

    if (body.action === 'disable') {
      const code = typeof body.code === 'string' ? body.code.trim() : '';
      const password = typeof body.password === 'string' ? body.password : '';
      if (!code && !password) {
        return Response.json(
          { error: 'A current authenticator code, backup code, or password is required' },
          { status: 401 },
        );
      }
      await disableMfa(session.userId, {
        code: code || undefined,
        password: password || undefined,
      });
      return Response.json({ success: true });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    if (error instanceof AuthError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : 'MFA operation failed';
    return Response.json({ error: message }, { status: 400 });
  }
}

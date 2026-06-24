import { auth, disableMfa, enableMfa, generateMfaQrCode, generateMfaSecret } from '@zodyk/auth';
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
      await disableMfa(session.userId);
      return Response.json({ success: true });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'MFA operation failed';
    return Response.json({ error: message }, { status: 400 });
  }
}

import { AuthError, auth, changePassword } from '@zodyk/auth';
import { changePasswordSchema } from '@zodyk/core';

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const input = changePasswordSchema.parse(await request.json());
    await changePassword(session.userId, input.currentPassword, input.newPassword);
    return Response.json({ success: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : 'Request failed';
    return Response.json({ error: message }, { status: 400 });
  }
}

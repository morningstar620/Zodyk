import { hasPermission, type PermissionSubject } from './check';

export class AuthError extends Error {
  constructor(
    message: string,
    public status: number = 401,
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

export interface AuthSession extends PermissionSubject {
  userId: string;
  email: string;
  name: string;
  tenantId: string;
  roleIds: string[];
}

export function requireAuth(session: AuthSession | null | undefined): AuthSession {
  if (!session?.userId) {
    throw new AuthError('Authentication required', 401);
  }
  return session;
}

export function requirePermission(
  session: AuthSession | null | undefined,
  permission: string,
): AuthSession {
  const authSession = requireAuth(session);
  if (!hasPermission(authSession, permission)) {
    throw new AuthError('Insufficient permissions', 403);
  }
  return authSession;
}

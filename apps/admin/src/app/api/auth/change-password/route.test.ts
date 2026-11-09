import { beforeEach, describe, expect, it, vi } from 'vitest';

const auth = vi.hoisted(() => vi.fn());
const changePassword = vi.hoisted(() => vi.fn(async () => undefined));

vi.mock('@zodyk/auth', async () => {
  const { AuthError } = await import('../../../../../../../packages/auth/src/rbac/middleware');
  return { AuthError, auth, changePassword };
});

import { POST } from './route';

function change(body: unknown) {
  return POST(
    new Request('http://localhost/api/auth/change-password', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }),
  );
}

describe('POST /api/auth/change-password', () => {
  beforeEach(() => {
    auth.mockReset().mockResolvedValue({ userId: 'user-1' });
    changePassword.mockReset().mockResolvedValue(undefined);
  });

  it('returns 401 without a session', async () => {
    auth.mockResolvedValue(null);

    const response = await change({
      currentPassword: 'CurrentPassword1!',
      newPassword: 'NewPassword1!',
      confirmPassword: 'NewPassword1!',
    });

    expect(response.status).toBe(401);
    expect(changePassword).not.toHaveBeenCalled();
  });

  it('changes the password for the signed-in user', async () => {
    const response = await change({
      currentPassword: 'CurrentPassword1!',
      newPassword: 'NewPassword1!',
      confirmPassword: 'NewPassword1!',
    });

    expect(response.status).toBe(200);
    expect(changePassword).toHaveBeenCalledWith(
      'user-1',
      'CurrentPassword1!',
      'NewPassword1!',
    );
  });

  it('surfaces a wrong current password as a 400', async () => {
    const { AuthError } = await import('../../../../../../../packages/auth/src/rbac/middleware');
    changePassword.mockRejectedValue(new AuthError('Current password is incorrect', 400));

    const response = await change({
      currentPassword: 'WrongPassword1!',
      newPassword: 'NewPassword1!',
      confirmPassword: 'NewPassword1!',
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'Current password is incorrect' });
  });

  it('rejects mismatched confirmation before calling the helper', async () => {
    const response = await change({
      currentPassword: 'CurrentPassword1!',
      newPassword: 'NewPassword1!',
      confirmPassword: 'DifferentPassword1!',
    });

    expect(response.status).toBe(400);
    expect(changePassword).not.toHaveBeenCalled();
  });
});

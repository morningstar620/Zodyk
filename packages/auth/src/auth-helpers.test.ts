import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type Mock = ReturnType<typeof vi.fn>;

interface MockModels {
  User: { findOne: Mock; findById: Mock; findByIdAndUpdate: Mock };
  PasswordResetToken: { deleteMany: Mock; create: Mock; findOne: Mock; updateMany: Mock };
  ApiToken: { updateMany: Mock };
}

const state = vi.hoisted(() => ({
  models: {} as MockModels,
}));

vi.mock('@zodyk/database', () => ({
  connectDatabase: vi.fn(async () => undefined),
  getModels: () => state.models,
}));

vi.mock('./providers/email', () => ({
  sendPasswordResetEmail: vi.fn(async () => undefined),
}));

vi.mock('./security/password', () => ({
  hashPassword: vi.fn(async (password: string) => `hashed:${password}`),
  verifyPassword: vi.fn(async (password: string, hash: string) => hash === `hashed:${password}`),
}));

vi.mock('./security/encryption', () => ({
  hashToken: (token: string) => `hash:${token}`,
}));

import { sendPasswordResetEmail } from './providers/email';
import { changePassword, requestPasswordReset, resetPassword } from './auth-helpers';
import { AuthError } from './rbac/middleware';

function createModels() {
  state.models = {
    User: {
      findOne: vi.fn(),
      findById: vi.fn(),
      findByIdAndUpdate: vi.fn(),
    },
    PasswordResetToken: {
      deleteMany: vi.fn(),
      create: vi.fn(),
      findOne: vi.fn(),
      updateMany: vi.fn(),
    },
    ApiToken: {
      updateMany: vi.fn(),
    },
  };
  return state.models;
}

describe('requestPasswordReset', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('MONGODB_URI', 'mongodb://localhost/test');
    createModels();
    state.models.User.findOne.mockResolvedValue({ _id: 'user-1', email: 'person@example.com' });
    state.models.PasswordResetToken.deleteMany.mockResolvedValue({ deletedCount: 2 });
    state.models.PasswordResetToken.create.mockResolvedValue({});
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('deletes older unused reset tokens and sends only the new link', async () => {
    vi.stubEnv('AUTH_URL', 'https://admin.example.com/');

    await requestPasswordReset('Person@Example.com');

    expect(state.models.User.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'person@example.com' }),
    );
    expect(state.models.PasswordResetToken.deleteMany).toHaveBeenCalledWith({
      userId: 'user-1',
      usedAt: { $exists: false },
    });
    expect(state.models.PasswordResetToken.create).toHaveBeenCalledTimes(1);
    expect(sendPasswordResetEmail).toHaveBeenCalledTimes(1);

    const [email, resetUrl] = vi.mocked(sendPasswordResetEmail).mock.calls[0]!;
    expect(email).toBe('person@example.com');
    expect(resetUrl).toMatch(/^https:\/\/admin\.example\.com\/reset-password\?token=[a-f0-9]{64}$/);
  });

  it('refuses to send a reset email in production when AUTH_URL is unset', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('AUTH_URL', '');
    vi.stubEnv('ADMIN_URL', '');

    await expect(requestPasswordReset('person@example.com')).rejects.toThrow(/AUTH_URL/);

    expect(state.models.PasswordResetToken.deleteMany).not.toHaveBeenCalled();
    expect(state.models.PasswordResetToken.create).not.toHaveBeenCalled();
    expect(sendPasswordResetEmail).not.toHaveBeenCalled();
  });

  it('falls back to the admin port in development, never port 3000', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('AUTH_URL', '');
    vi.stubEnv('ADMIN_URL', '');

    await requestPasswordReset('person@example.com');

    const [, resetUrl] = vi.mocked(sendPasswordResetEmail).mock.calls[0]!;
    expect(resetUrl).toMatch(/^http:\/\/localhost:5001\/reset-password\?/);
    expect(resetUrl).not.toContain('localhost:3000');
  });

  it('uses ADMIN_URL in development when AUTH_URL is unset', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('AUTH_URL', '');
    vi.stubEnv('ADMIN_URL', 'http://admin.internal:8080');

    await requestPasswordReset('person@example.com');

    const [, resetUrl] = vi.mocked(sendPasswordResetEmail).mock.calls[0]!;
    expect(resetUrl).toMatch(/^http:\/\/admin\.internal:8080\/reset-password\?/);
  });
});

describe('resetPassword', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('MONGODB_URI', 'mongodb://localhost/test');
    createModels();
    state.models.PasswordResetToken.findOne.mockResolvedValue({ userId: 'user-1' });
    state.models.User.findByIdAndUpdate.mockResolvedValue({});
    state.models.PasswordResetToken.updateMany.mockResolvedValue({ modifiedCount: 2 });
    state.models.ApiToken.updateMany.mockResolvedValue({ modifiedCount: 3 });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('marks every unused reset token as used and revokes all API tokens', async () => {
    await resetPassword('valid-token', 'NewPassword1!');

    expect(state.models.PasswordResetToken.findOne).toHaveBeenCalledWith({
      tokenHash: 'hash:valid-token',
      usedAt: { $exists: false },
      expires: { $gt: expect.any(Date) },
    });
    expect(state.models.User.findByIdAndUpdate).toHaveBeenCalledWith('user-1', {
      passwordHash: 'hashed:NewPassword1!',
    });
    expect(state.models.PasswordResetToken.updateMany).toHaveBeenCalledWith(
      { userId: 'user-1', usedAt: { $exists: false } },
      { $set: { usedAt: expect.any(Date) } },
    );
    expect(state.models.ApiToken.updateMany).toHaveBeenCalledWith(
      { userId: 'user-1', revokedAt: { $exists: false } },
      { $set: { revokedAt: expect.any(Date) } },
    );
  });

  it('rejects an older token after the newer reset completed', async () => {
    // The first call finds the token; afterwards the older token is marked used.
    state.models.PasswordResetToken.findOne
      .mockResolvedValueOnce({ userId: 'user-1' })
      .mockResolvedValueOnce(null);

    await resetPassword('newer-token', 'NewPassword1!');
    await expect(resetPassword('older-token', 'AnotherPassword1!')).rejects.toThrow(
      /Invalid or expired reset token/,
    );

    expect(state.models.User.findByIdAndUpdate).toHaveBeenCalledTimes(1);
  });
});

describe('changePassword', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('MONGODB_URI', 'mongodb://localhost/test');
    createModels();
    state.models.User.findById.mockResolvedValue({
      _id: 'user-1',
      passwordHash: 'hashed:CurrentPassword1!',
      save: vi.fn(async () => undefined),
    });
    state.models.PasswordResetToken.updateMany.mockResolvedValue({ modifiedCount: 1 });
    state.models.ApiToken.updateMany.mockResolvedValue({ modifiedCount: 1 });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('rejects a wrong current password without updating or revoking anything', async () => {
    await expect(changePassword('user-1', 'WrongPassword1!', 'NewPassword1!')).rejects.toMatchObject(
      { status: 400, message: 'Current password is incorrect' },
    );

    const user = await state.models.User.findById.mock.results[0]!.value;
    expect(user.save).not.toHaveBeenCalled();
    expect(state.models.PasswordResetToken.updateMany).not.toHaveBeenCalled();
    expect(state.models.ApiToken.updateMany).not.toHaveBeenCalled();
  });

  it('updates the hash and revokes reset links and API tokens when the current password matches', async () => {
    await changePassword('user-1', 'CurrentPassword1!', 'NewPassword1!');

    const user = await state.models.User.findById.mock.results[0]!.value;
    expect(user.passwordHash).toBe('hashed:NewPassword1!');
    expect(user.save).toHaveBeenCalledTimes(1);
    expect(state.models.PasswordResetToken.updateMany).toHaveBeenCalledWith(
      { userId: 'user-1', usedAt: { $exists: false } },
      { $set: { usedAt: expect.any(Date) } },
    );
    expect(state.models.ApiToken.updateMany).toHaveBeenCalledWith(
      { userId: 'user-1', revokedAt: { $exists: false } },
      { $set: { revokedAt: expect.any(Date) } },
    );
  });

  it('rejects accounts without a password', async () => {
    state.models.User.findById.mockResolvedValue({ _id: 'user-1', save: vi.fn() });

    await expect(changePassword('user-1', 'anything', 'NewPassword1!')).rejects.toBeInstanceOf(
      AuthError,
    );
  });
});

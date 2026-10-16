import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthError } from '../rbac/middleware';

const mocks = vi.hoisted(() => ({
  findById: vi.fn(),
  findByIdAndUpdate: vi.fn(),
  verifyPassword: vi.fn(),
}));

vi.mock('@zodyk/database', () => ({
  connectDatabase: vi.fn(async () => ({})),
  getModels: () => ({
    User: {
      findById: mocks.findById,
      findByIdAndUpdate: mocks.findByIdAndUpdate,
    },
  }),
}));

vi.mock('../security/password', () => ({
  hashPassword: vi.fn(),
  verifyPassword: mocks.verifyPassword,
}));

import { clearRateLimits } from '../security/rate-limit';
import { disableMfa } from './verify';

describe('disableMfa', () => {
  beforeEach(() => {
    clearRateLimits();
    process.env.MONGODB_URI = 'mongodb://localhost/zodyk-test';
    mocks.findById.mockReset();
    mocks.findByIdAndUpdate.mockReset().mockResolvedValue(null);
    mocks.verifyPassword.mockReset();
  });

  it('rejects a disable request with no second factor', async () => {
    await expect(disableMfa('user-1', {})).rejects.toBeInstanceOf(AuthError);
    await expect(disableMfa('user-1', {})).rejects.toMatchObject({ status: 401 });
    expect(mocks.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  it('rejects an invalid password and does not clear MFA', async () => {
    mocks.findById.mockResolvedValue({ mfaEnabled: true, passwordHash: 'hash' });
    mocks.verifyPassword.mockResolvedValue(false);

    await expect(disableMfa('user-1', { password: 'wrong' })).rejects.toMatchObject({
      status: 401,
    });
    expect(mocks.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  it('clears MFA after the current password is verified', async () => {
    mocks.findById.mockResolvedValue({ mfaEnabled: true, passwordHash: 'hash' });
    mocks.verifyPassword.mockResolvedValue(true);

    await disableMfa('user-1', { password: 'Password1!' });
    expect(mocks.findByIdAndUpdate).toHaveBeenCalledWith('user-1', {
      mfaEnabled: false,
      mfaSecret: undefined,
      mfaBackupCodes: [],
    });
  });
});

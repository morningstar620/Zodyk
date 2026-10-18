import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { decryptOAuthSecret } from '../security/oauth-tokens';

const mocks = vi.hoisted(() => ({
  userFindOne: vi.fn(),
  userFindById: vi.fn(),
  userCreate: vi.fn(),
  roleFindOne: vi.fn(),
  accountFindOne: vi.fn(),
  accountUpdate: vi.fn(),
}));

vi.mock('@zodyk/database', () => ({
  connectDatabase: vi.fn(async () => ({})),
  getModels: () => ({
    User: {
      findOne: mocks.userFindOne,
      findById: mocks.userFindById,
      create: mocks.userCreate,
    },
    Role: { findOne: mocks.roleFindOne },
    Account: {
      findOne: mocks.accountFindOne,
      findOneAndUpdate: mocks.accountUpdate,
    },
  }),
}));

import { completeProviderSignIn } from './provider-sign-in';

function activeUser(id = 'user-1') {
  return {
    _id: { toString: () => id },
    email: 'ada@example.com',
    name: 'Ada',
    status: 'active',
    deletedAt: undefined,
  };
}

describe('completeProviderSignIn', () => {
  beforeEach(() => {
    process.env.MONGODB_URI = 'mongodb://localhost/zodyk-test';
    process.env.ENCRYPTION_KEY = 'test-encryption-key';
    process.env.ALLOW_REGISTRATION = 'false';
    mocks.userFindOne.mockReset().mockResolvedValue(null);
    mocks.userFindById.mockReset().mockResolvedValue(null);
    mocks.userCreate.mockReset();
    mocks.roleFindOne.mockReset().mockResolvedValue({ _id: 'viewer' });
    mocks.accountFindOne.mockReset().mockResolvedValue(null);
    mocks.accountUpdate.mockReset().mockResolvedValue(null);
  });

  afterEach(() => {
    delete process.env.ALLOW_REGISTRATION;
  });

  it('does not create an account for a new Google or magic-link email when registration is closed', async () => {
    const oauth = await completeProviderSignIn({
      email: 'new@example.com',
      name: 'New',
      account: {
        provider: 'google',
        type: 'oidc',
        providerAccountId: 'google-1',
        access_token: 'plain-access',
      },
      profile: { email_verified: true },
    });
    const magicLink = await completeProviderSignIn({
      email: 'new@example.com',
      account: { provider: 'email', type: 'email', providerAccountId: 'new@example.com' },
      verificationRequest: true,
    });

    expect(oauth).toEqual({ ok: false, reason: 'registration-closed' });
    expect(magicLink).toEqual({ ok: false, reason: 'registration-closed' });
    expect(mocks.userCreate).not.toHaveBeenCalled();
    expect(mocks.accountUpdate).not.toHaveBeenCalled();
  });

  it('refuses to link an OAuth identity onto an existing password user', async () => {
    mocks.userFindOne.mockResolvedValue(activeUser());
    const result = await completeProviderSignIn({
      email: 'ada@example.com',
      account: {
        provider: 'github',
        type: 'oauth',
        providerAccountId: 'gh-1',
        access_token: 'plain-access',
      },
      profile: { email_verified: true },
    });

    expect(result).toEqual({ ok: false, reason: 'link-required' });
    expect(mocks.userCreate).not.toHaveBeenCalled();
    expect(mocks.accountUpdate).not.toHaveBeenCalled();
  });

  it('links a verified matching provider while the user is signed in and encrypts tokens', async () => {
    mocks.userFindOne.mockResolvedValue(activeUser());
    const result = await completeProviderSignIn({
      email: 'ada@example.com',
      account: {
        provider: 'google',
        type: 'oidc',
        providerAccountId: 'google-1',
        access_token: 'plain-access',
        refresh_token: 'plain-refresh',
        id_token: 'plain-id',
      },
      profile: { email_verified: true },
      sessionUser: { userId: 'user-1', email: 'Ada@Example.com' },
    });

    expect(result).toMatchObject({ ok: true, mode: 'link', userId: 'user-1' });
    expect(mocks.userCreate).not.toHaveBeenCalled();
    const update = mocks.accountUpdate.mock.calls[0]?.[1] as {
      userId: string;
      access_token: string;
      refresh_token: string;
      id_token: string;
    };
    expect(update.userId).toBe('user-1');
    expect(update.access_token).not.toContain('plain-access');
    expect(decryptOAuthSecret(update.access_token)).toBe('plain-access');
    expect(decryptOAuthSecret(update.refresh_token)).toBe('plain-refresh');
    expect(decryptOAuthSecret(update.id_token)).toBe('plain-id');
  });

  it('creates a user only when registration is open and the provider email is verified', async () => {
    process.env.ALLOW_REGISTRATION = 'true';
    mocks.userCreate.mockResolvedValue({ _id: { toString: () => 'new-user' } });

    const unverified = await completeProviderSignIn({
      email: 'new@example.com',
      account: { provider: 'google', type: 'oidc', providerAccountId: 'google-9' },
      profile: { email_verified: false },
    });
    expect(unverified).toEqual({ ok: false, reason: 'unverified-email' });
    expect(mocks.userCreate).not.toHaveBeenCalled();

    const created = await completeProviderSignIn({
      email: 'new@example.com',
      name: 'New',
      account: {
        provider: 'google',
        type: 'oidc',
        providerAccountId: 'google-9',
        access_token: 'plain-access',
      },
      profile: { email_verified: true },
    });
    expect(created).toMatchObject({ ok: true, mode: 'create', userId: 'new-user' });
    expect(mocks.userCreate).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'new@example.com', status: 'active', roleIds: ['viewer'] }),
    );
    const update = mocks.accountUpdate.mock.calls[0]?.[1] as { access_token: string };
    expect(update.access_token).not.toContain('plain-access');
  });

  it('rejects a suspended linked account', async () => {
    mocks.accountFindOne.mockResolvedValue({ userId: { toString: () => 'user-1' } });
    mocks.userFindById.mockResolvedValue({ ...activeUser(), status: 'suspended' });
    const result = await completeProviderSignIn({
      email: 'ada@example.com',
      account: { provider: 'google', type: 'oidc', providerAccountId: 'google-1' },
      profile: { email_verified: true },
    });
    expect(result).toEqual({ ok: false, reason: 'inactive' });
    expect(mocks.accountUpdate).not.toHaveBeenCalled();
  });
});

import { describe, expect, it } from 'vitest';
import { decideProviderSignIn, providerEmailVerified } from './account-linking';

const active = { userId: 'user-1', userActive: true };
const suspended = { userId: 'user-1', userActive: false };

describe('decideProviderSignIn', () => {
  it('refuses a new OAuth or magic-link identity when registration is closed', () => {
    expect(
      decideProviderSignIn({
        kind: 'oauth',
        email: 'new@example.com',
        emailVerified: true,
        verificationRequest: false,
        registrationAllowed: false,
        linkedAccount: null,
        existingUser: null,
        sessionUser: null,
      }),
    ).toEqual({ ok: false, reason: 'registration-closed' });

    expect(
      decideProviderSignIn({
        kind: 'email',
        email: 'new@example.com',
        emailVerified: true,
        verificationRequest: true,
        registrationAllowed: false,
        linkedAccount: null,
        existingUser: null,
        sessionUser: null,
      }),
    ).toEqual({ ok: false, reason: 'registration-closed' });
  });

  it('does not attach an OAuth login to an existing user by email', () => {
    expect(
      decideProviderSignIn({
        kind: 'oauth',
        email: 'ada@example.com',
        emailVerified: true,
        verificationRequest: false,
        registrationAllowed: true,
        linkedAccount: null,
        existingUser: active,
        sessionUser: null,
      }),
    ).toEqual({ ok: false, reason: 'link-required' });
  });

  it('links only for an authenticated session with a verified matching email', () => {
    expect(
      decideProviderSignIn({
        kind: 'oauth',
        email: 'ada@example.com',
        emailVerified: true,
        verificationRequest: false,
        registrationAllowed: false,
        linkedAccount: null,
        existingUser: active,
        sessionUser: { userId: 'user-1', email: 'ada@example.com' },
      }),
    ).toEqual({ ok: true, mode: 'link', userId: 'user-1' });

    expect(
      decideProviderSignIn({
        kind: 'oauth',
        email: 'other@example.com',
        emailVerified: true,
        verificationRequest: false,
        registrationAllowed: true,
        linkedAccount: null,
        existingUser: null,
        sessionUser: { userId: 'user-1', email: 'ada@example.com' },
      }),
    ).toEqual({ ok: false, reason: 'email-mismatch' });

    expect(
      decideProviderSignIn({
        kind: 'oauth',
        email: 'ada@example.com',
        emailVerified: false,
        verificationRequest: false,
        registrationAllowed: true,
        linkedAccount: null,
        existingUser: active,
        sessionUser: { userId: 'user-1', email: 'ada@example.com' },
      }),
    ).toEqual({ ok: false, reason: 'unverified-email' });
  });

  it('rejects suspended linked accounts and still allows an existing magic-link user', () => {
    expect(
      decideProviderSignIn({
        kind: 'oauth',
        email: 'ada@example.com',
        emailVerified: true,
        verificationRequest: false,
        registrationAllowed: true,
        linkedAccount: suspended,
        existingUser: suspended,
        sessionUser: null,
      }),
    ).toEqual({ ok: false, reason: 'inactive' });

    expect(
      decideProviderSignIn({
        kind: 'email',
        email: 'ada@example.com',
        emailVerified: true,
        verificationRequest: false,
        registrationAllowed: false,
        linkedAccount: null,
        existingUser: active,
        sessionUser: null,
      }),
    ).toEqual({ ok: true, mode: 'sign-in', userId: 'user-1' });
  });
});

describe('providerEmailVerified', () => {
  it('accepts only an explicit verified flag for OAuth profiles', () => {
    expect(providerEmailVerified('google', { email_verified: true })).toBe(true);
    expect(providerEmailVerified('google', { email_verified: false })).toBe(false);
    expect(providerEmailVerified('github', { email: 'ada@example.com' })).toBe(false);
    expect(providerEmailVerified('email', {})).toBe(true);
  });
});

export type ProviderKind = 'oauth' | 'email';

export type ProviderSignInReason =
  | 'missing-email'
  | 'registration-closed'
  | 'inactive'
  | 'unverified-email'
  | 'link-required'
  | 'email-mismatch'
  | 'already-linked';

export type ProviderSignInDecision =
  | { ok: true; mode: 'verification-request' }
  | { ok: true; mode: 'sign-in'; userId: string }
  | { ok: true; mode: 'link'; userId: string }
  | { ok: true; mode: 'create' }
  | { ok: false; reason: ProviderSignInReason };

export interface ProviderIdentity {
  userId: string;
  userActive: boolean;
}

/**
 * Decide whether a non-credentials provider may sign in, create, or link.
 * OAuth accounts are never attached to an existing user by email alone.
 * Linking requires an already authenticated session and a verified matching email.
 */
export function decideProviderSignIn(input: {
  kind: ProviderKind;
  email?: string | null;
  emailVerified: boolean;
  verificationRequest: boolean;
  registrationAllowed: boolean;
  linkedAccount: ProviderIdentity | null;
  existingUser: ProviderIdentity | null;
  sessionUser: { userId: string; email: string } | null;
}): ProviderSignInDecision {
  const email = input.email?.trim().toLowerCase();
  if (!email) return { ok: false, reason: 'missing-email' };

  if (input.verificationRequest) {
    if (input.existingUser && !input.existingUser.userActive) {
      return { ok: false, reason: 'inactive' };
    }
    if (!input.existingUser && !input.registrationAllowed) {
      return { ok: false, reason: 'registration-closed' };
    }
    return { ok: true, mode: 'verification-request' };
  }

  if (input.linkedAccount) {
    if (!input.linkedAccount.userActive) return { ok: false, reason: 'inactive' };
    if (input.sessionUser && input.sessionUser.userId !== input.linkedAccount.userId) {
      return { ok: false, reason: 'already-linked' };
    }
    return { ok: true, mode: 'sign-in', userId: input.linkedAccount.userId };
  }

  if (input.sessionUser) {
    if (input.kind === 'oauth' && !input.emailVerified) {
      return { ok: false, reason: 'unverified-email' };
    }
    if (input.sessionUser.email.trim().toLowerCase() !== email) {
      return { ok: false, reason: 'email-mismatch' };
    }
    if (input.existingUser && input.existingUser.userId !== input.sessionUser.userId) {
      return { ok: false, reason: 'email-mismatch' };
    }
    if (input.existingUser && !input.existingUser.userActive) {
      return { ok: false, reason: 'inactive' };
    }
    return { ok: true, mode: 'link', userId: input.sessionUser.userId };
  }

  if (input.kind === 'email' && input.existingUser) {
    if (!input.existingUser.userActive) return { ok: false, reason: 'inactive' };
    return { ok: true, mode: 'sign-in', userId: input.existingUser.userId };
  }

  if (input.kind === 'oauth' && input.existingUser) {
    return { ok: false, reason: 'link-required' };
  }

  if (!input.registrationAllowed) return { ok: false, reason: 'registration-closed' };
  if (input.kind === 'oauth' && !input.emailVerified) {
    return { ok: false, reason: 'unverified-email' };
  }
  return { ok: true, mode: 'create' };
}

export function providerKind(account: { provider: string; type: string }): ProviderKind {
  if (
    account.type === 'email' ||
    account.provider === 'email' ||
    account.provider === 'nodemailer'
  ) {
    return 'email';
  }
  return 'oauth';
}

/** Google and GitHub must assert email_verified. Magic links prove the mailbox separately. */
export function providerEmailVerified(provider: string, profile: unknown): boolean {
  if (provider === 'email' || provider === 'nodemailer') return true;
  if (!profile || typeof profile !== 'object') return false;
  return (profile as { email_verified?: unknown }).email_verified === true;
}

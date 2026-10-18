import { DEFAULT_TENANT_ID } from '@zodyk/core';
import { connectDatabase, getModels } from '@zodyk/database';
import {
  decideProviderSignIn,
  providerEmailVerified,
  providerKind,
  type ProviderIdentity,
  type ProviderSignInDecision,
} from './account-linking';
import { isRegistrationAllowed } from '../security/registration';
import { encryptOAuthSecrets } from '../security/oauth-tokens';
import { isActiveAccount } from '../session-user';

export interface ProviderAccountInput {
  provider: string;
  type: string;
  providerAccountId: string;
  refresh_token?: string | null;
  access_token?: string | null;
  expires_at?: number | null;
  token_type?: string | null;
  scope?: string | null;
  id_token?: string | null;
  session_state?: string | null;
}

function identityOf(
  user: {
    _id: { toString(): string };
    status?: string | null;
    deletedAt?: Date | null;
  } | null,
): ProviderIdentity | null {
  if (!user) return null;
  return { userId: user._id.toString(), userActive: isActiveAccount(user) };
}

async function storeLinkedAccount(userId: string, account: ProviderAccountInput): Promise<void> {
  const secrets = encryptOAuthSecrets(account);
  const update: Record<string, unknown> = {
    userId,
    type: account.type,
    provider: account.provider,
    providerAccountId: account.providerAccountId,
  };
  if (secrets.access_token) update.access_token = secrets.access_token;
  if (secrets.refresh_token) update.refresh_token = secrets.refresh_token;
  if (secrets.id_token) update.id_token = secrets.id_token;
  if (account.expires_at != null) update.expires_at = account.expires_at;
  if (account.token_type) update.token_type = account.token_type;
  if (account.scope) update.scope = account.scope;
  if (account.session_state) update.session_state = account.session_state;

  const { Account } = getModels();
  await Account.findOneAndUpdate(
    { provider: account.provider, providerAccountId: account.providerAccountId },
    update,
    { upsert: true },
  );
}

export async function completeProviderSignIn(input: {
  email?: string | null;
  name?: string | null;
  image?: string | null;
  account: ProviderAccountInput;
  profile?: unknown;
  verificationRequest?: boolean;
  sessionUser?: { userId: string; email: string } | null;
}): Promise<ProviderSignInDecision & { userId?: string }> {
  const email = input.email?.trim().toLowerCase();
  if (!email) return { ok: false, reason: 'missing-email' };

  const uri = process.env.MONGODB_URI;
  if (!uri) return { ok: false, reason: 'registration-closed' };

  await connectDatabase(uri);
  const { User, Role, Account } = getModels();

  const linked = input.account.providerAccountId
    ? await Account.findOne({
        provider: input.account.provider,
        providerAccountId: input.account.providerAccountId,
      })
    : null;
  const linkedUser = linked ? await User.findById(linked.userId) : null;
  if (linked && !linkedUser) return { ok: false, reason: 'inactive' };
  const existing = await User.findOne({ email, tenantId: DEFAULT_TENANT_ID });

  const kind = providerKind(input.account);
  const decision = decideProviderSignIn({
    kind,
    email,
    emailVerified:
      kind === 'email' ? true : providerEmailVerified(input.account.provider, input.profile),
    verificationRequest: Boolean(input.verificationRequest),
    registrationAllowed: isRegistrationAllowed(),
    linkedAccount: identityOf(linkedUser),
    existingUser: identityOf(existing),
    sessionUser: input.sessionUser ?? null,
  });

  if (!decision.ok || decision.mode === 'verification-request') return decision;

  let userId: string;
  if (decision.mode === 'create') {
    const viewerRole = await Role.findOne({ slug: 'viewer', tenantId: DEFAULT_TENANT_ID });
    const created = await User.create({
      email,
      name: input.name?.trim() || email.split('@')[0] || email,
      status: 'active',
      roleIds: viewerRole ? [viewerRole._id] : [],
      tenantId: DEFAULT_TENANT_ID,
      emailVerified: new Date(),
      image: input.image,
    });
    userId = created._id.toString();
  } else {
    userId = decision.userId;
  }

  await storeLinkedAccount(userId, input.account);
  return { ...decision, userId };
}

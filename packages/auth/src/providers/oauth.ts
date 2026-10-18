import type { Provider } from 'next-auth/providers';
import GitHub from 'next-auth/providers/github';
import Google from 'next-auth/providers/google';

interface GitHubEmail {
  email?: string;
  primary?: boolean;
  verified?: boolean;
}

/**
 * GitHub's default profile email is not guaranteed verified.
 * Only a verified address from the emails API may be used for sign-in or linking.
 */
async function githubUserinfo({
  tokens,
}: {
  tokens: { access_token?: string };
}): Promise<Record<string, unknown>> {
  const accessToken = tokens.access_token;
  if (!accessToken) return { email_verified: false };

  const headers = {
    Authorization: `Bearer ${accessToken}`,
    Accept: 'application/vnd.github+json',
    'User-Agent': 'zodyk',
  };
  const profileResponse = await fetch('https://api.github.com/user', { headers });
  if (!profileResponse.ok) {
    throw new Error('GitHub profile request failed');
  }
  const profile = (await profileResponse.json()) as Record<string, unknown>;
  const emailsResponse = await fetch('https://api.github.com/user/emails', { headers });
  if (!emailsResponse.ok) {
    profile.email_verified = false;
    return profile;
  }

  const emails = (await emailsResponse.json()) as GitHubEmail[];
  if (!Array.isArray(emails)) {
    profile.email_verified = false;
    return profile;
  }
  const verified =
    emails.find((entry) => entry.primary && entry.verified && entry.email) ??
    emails.find((entry) => entry.verified && entry.email);
  if (verified?.email) {
    profile.email = verified.email;
    profile.email_verified = true;
  } else {
    profile.email = null;
    profile.email_verified = false;
  }
  return profile;
}

export function getOAuthProviders(): Provider[] {
  const providers: Provider[] = [];

  if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
    providers.push(
      Google({
        clientId: process.env.AUTH_GOOGLE_ID,
        clientSecret: process.env.AUTH_GOOGLE_SECRET,
      }),
    );
  }

  if (process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET) {
    providers.push(
      GitHub({
        clientId: process.env.AUTH_GITHUB_ID,
        clientSecret: process.env.AUTH_GITHUB_SECRET,
        userinfo: {
          url: 'https://api.github.com/user',
          request: githubUserinfo,
        },
      }),
    );
  }

  return providers;
}

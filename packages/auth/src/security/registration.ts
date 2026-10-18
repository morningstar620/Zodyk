/** Credentials, OAuth, and magic-link sign-up all honor this flag. */
export function isRegistrationAllowed(): boolean {
  return process.env.ALLOW_REGISTRATION === 'true';
}

export { handlers, auth, signIn, signOut, sessionToAuthSession } from './handlers';
export { authConfig } from './config';
export { authConfig as edgeAuthConfig } from './auth.config';
export { resolveSessionFromHeaders } from './session-from-request';
export * from './rbac/check';
export * from './rbac/middleware';
export * from './security/password';
export * from './security/encryption';
export * from './security/audit';
export * from './security/rate-limit';
export { assertResetPasswordRateLimit } from './security/reset-password-limit';
export { isRegistrationAllowed } from './security/registration';
export { canAssignRoles, isPrivilegedRole } from './rbac/role-hierarchy';
export * from './mfa/setup';
export * from './mfa/verify';
export * from './tokens/api-token';
export * from './auth-helpers';
export {
  registerUser,
  requestPasswordReset,
  resetPassword,
  completeMfaLogin,
} from './auth-helpers';

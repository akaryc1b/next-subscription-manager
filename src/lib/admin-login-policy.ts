export type LoginAccount = { role: string; isActive: boolean; isBanned: boolean }

/** Subscription eligibility is independent of permission to sign in. */
export function canAdminLogin(account: LoginAccount | null | undefined): boolean {
  return account?.role === 'admin' && account.isActive === true && account.isBanned === false
}

/** These routes may start a new identity; the session-creation hook checks it. */
export function isAuthEntryPath(path: string): boolean {
  return path.startsWith('/api/auth/sign-in/')
    || path.startsWith('/api/auth/callback/')
    || path === '/api/auth/passkey/generate-authenticate-options'
    || path === '/api/auth/passkey/verify-authentication'
    || path === '/api/auth/sign-out'
    || path === '/api/auth/error'
}

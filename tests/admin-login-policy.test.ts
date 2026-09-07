import { expect, test } from 'vitest'
import { canAdminLogin, isAuthEntryPath } from '../src/lib/admin-login-policy'
import { userCreateSchema } from '../src/lib/api-schemas'

test.each([
  [null, false], [undefined, false],
  [{ role: 'user', isActive: true, isBanned: false }, false],
  [{ role: 'admin', isActive: false, isBanned: false }, false],
  [{ role: 'admin', isActive: true, isBanned: true }, false],
  [{ role: 'admin', isActive: true, isBanned: false }, true],
] as const)('only enabled unbanned administrators may log in: %j', (account, allowed) => {
  expect(canAdminLogin(account)).toBe(allowed)
})
test('subscription creation does not accept a login password', () => {
  expect(userCreateSchema.safeParse({ email: 'reader@example.test', role: 'user', password: 'Not-a-subscriber-password' }).success).toBe(false)
  expect(userCreateSchema.safeParse({ email: 'admin@example.test', role: 'admin', password: 'Admin-only-test-password' }).success).toBe(true)
})
test('fresh authentication remains available but identity mutations are protected', () => {
  for (const path of ['/api/auth/sign-in/email', '/api/auth/sign-in/social', '/api/auth/callback/github', '/api/auth/passkey/verify-authentication', '/api/auth/sign-out']) expect(isAuthEntryPath(path)).toBe(true)
  for (const path of ['/api/auth/update-user', '/api/auth/change-password', '/api/auth/get-session', '/api/auth/list-sessions', '/api/auth/link-social', '/api/auth/passkey/generate-register-options']) expect(isAuthEntryPath(path)).toBe(false)
})

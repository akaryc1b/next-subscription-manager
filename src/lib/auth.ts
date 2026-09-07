import { betterAuth } from 'better-auth'
import { APIError } from 'better-auth/api'
import { canAdminLogin } from './admin-login-policy'
import { adminAuthAdapter } from './admin-auth-adapter'
import { passkey } from '@better-auth/passkey'
import { prisma } from './prisma'

const authBaseUrl = process.env.BETTER_AUTH_URL || 'http://localhost:3000'
const trustedOrigins = Array.from(new Set([
  authBaseUrl,
  ...(process.env.BETTER_AUTH_TRUSTED_ORIGINS || '').split(',').map(origin => origin.trim()).filter(Boolean),
  ...(process.env.NODE_ENV === 'production' ? [] : ['http://localhost:3000', 'http://localhost:3001']),
]))
const githubClientId = process.env.GITHUB_CLIENT_ID
const githubClientSecret = process.env.GITHUB_CLIENT_SECRET

export const auth = betterAuth({
  baseURL: authBaseUrl,
  database: adminAuthAdapter(prisma),
  databaseHooks: {
    session: {
      create: {
        before: async session => {
          // An early rejection; the adapter rechecks atomically with the insert.
          const account = await prisma.user.findUnique({
            where: { id: session.userId },
            select: { role: true, isActive: true, isBanned: true },
          })
          if (!canAdminLogin(account)) {
            throw new APIError('FORBIDDEN', { code: 'ADMIN_ONLY', message: '仅启用且未封禁的管理员可以登录' })
          }
          return { data: session }
        },
      },
    },
  },
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
    minPasswordLength: 12,
    maxPasswordLength: 128,
  },
  socialProviders: githubClientId && githubClientSecret ? {
    github: { clientId: githubClientId, clientSecret: githubClientSecret, disableImplicitSignUp: true },
  } : {},
  plugins: [passkey()],
  account: { accountLinking: { enabled: true, trustedProviders: ['github'], allowDifferentEmails: false } },
  session: { expiresIn: 60 * 60 * 24 * 7, updateAge: 60 * 60 * 24, cookieCache: { enabled: false } },
  trustedOrigins,
})

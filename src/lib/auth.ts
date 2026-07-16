import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { passkey } from '@better-auth/passkey'
import { prisma } from './prisma'

const authBaseUrl = process.env.BETTER_AUTH_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  'http://localhost:3000'

const trustedOrigins = Array.from(new Set([
  authBaseUrl,
  ...(process.env.BETTER_AUTH_TRUSTED_ORIGINS || '')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean),
  ...(process.env.NODE_ENV === 'production'
    ? []
    : ['http://localhost:3000', 'http://localhost:3001']),
]))

const githubClientId = process.env.GITHUB_CLIENT_ID
const githubClientSecret = process.env.GITHUB_CLIENT_SECRET

export const auth = betterAuth({
  baseURL: authBaseUrl,
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
  },
  socialProviders: githubClientId && githubClientSecret
    ? {
        github: {
          clientId: githubClientId,
          clientSecret: githubClientSecret,
          disableImplicitSignUp: true, // Disable auto registration for unlinked GitHub accounts
        },
      }
    : {},
  plugins: [
    passkey(),
  ],
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ['github'],
      allowDifferentEmails: false,
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7天
    updateAge: 60 * 60 * 24, // 1天
  },
  trustedOrigins,
})

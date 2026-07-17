import { prisma } from '@/lib/prisma'

const WINDOW_MS = 15 * 60 * 1000
const MAX_FAILURES = 5

export type AuthRateLimitResult = {
  limited: boolean
  retryAfterSeconds: number
  remainingAttempts: number
}

export async function checkAuthRateLimit(
  ipAddress: string,
  identifier?: string
): Promise<AuthRateLimitResult> {
  const normalizedIdentifier = identifier?.trim().toLowerCase()
  const windowStartedAt = new Date(Date.now() - WINDOW_MS)
  const identityFilters = [
    ...(ipAddress !== 'unknown' ? [{ ipAddress }] : []),
    ...(normalizedIdentifier ? [{ identifier: normalizedIdentifier }] : []),
  ]

  if (identityFilters.length === 0) {
    return {
      limited: false,
      retryAfterSeconds: 0,
      remainingAttempts: MAX_FAILURES,
    }
  }

  const failureCount = await prisma.securityEvent.count({
    where: {
      type: 'auth_failure',
      createdAt: { gte: windowStartedAt },
      OR: identityFilters,
    },
  })

  return {
    limited: failureCount >= MAX_FAILURES,
    retryAfterSeconds: Math.ceil(WINDOW_MS / 1000),
    remainingAttempts: Math.max(0, MAX_FAILURES - failureCount),
  }
}

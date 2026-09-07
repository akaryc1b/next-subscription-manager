import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { canAdminLogin, isAuthEntryPath } from '@/lib/admin-login-policy'
import { checkAuthRateLimit } from '@/lib/auth-rate-limit'
import { getClientIp, recordSecurityEvent } from '@/lib/security-events'
import { toNextJsHandler } from 'better-auth/next-js'
import { NextRequest, NextResponse } from 'next/server'

const handler = toNextJsHandler(auth)

async function getAuthIdentifier(request: NextRequest): Promise<string | undefined> {
  if (request.method !== 'POST') return undefined
  try {
    const body = await request.clone().json()
    const identifier = body?.email || body?.username || body?.provider
    return typeof identifier === 'string' ? identifier.trim().toLowerCase() : undefined
  } catch { return undefined }
}

function wrapAuthHandler(method: (request: Request) => Response | Promise<Response>) {
  return async function securityAwareAuthHandler(request: NextRequest) {
    const path = new URL(request.url).pathname
    const identifier = await getAuthIdentifier(request)
    if (request.method === 'POST' && path.endsWith('/sign-in/email')) {
      const rateLimit = await checkAuthRateLimit(getClientIp(request), identifier)
      if (rateLimit.limited) {
        await recordSecurityEvent(request, {
          type: 'auth_rate_limited', severity: 'warning', statusCode: 429, identifier,
          message: '登录失败次数过多，已触发限流',
          metadata: { reason: 'rate_limited', retryAfterSeconds: rateLimit.retryAfterSeconds },
        })
        return NextResponse.json({ error: '登录尝试过于频繁，请稍后再试' }, {
          status: 429, headers: { 'Retry-After': String(rateLimit.retryAfterSeconds), 'Cache-Control': 'no-store' },
        })
      }
    }

    // Reject legacy subscriber sessions before authentication-management reads
    // or writes. Fresh sign-in and sign-out can recover from a stale cookie.
    if (!isAuthEntryPath(path) && request.headers.has('cookie')) {
      try {
        const session = await auth.api.getSession({ headers: request.headers, query: { disableCookieCache: true, disableRefresh: true } })
        if (session?.user?.id) {
          const account = await prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true, isActive: true, isBanned: true } })
          if (!canAdminLogin(account)) {
            const headers = { 'Cache-Control': 'private, no-store' }
            if (path === '/api/auth/get-session') return NextResponse.json(null, { headers })
            await recordSecurityEvent(request, {
              type: 'auth_failure', severity: 'warning', statusCode: 403, userId: session.user.id,
              message: '非管理员会话已被拒绝', metadata: { reason: 'admin_only' },
            })
            return NextResponse.json({ code: 'ADMIN_ONLY', message: '仅管理员可以登录和管理认证方式' }, { status: 403, headers })
          }
        }
      } catch {
        return NextResponse.json({ code: 'AUTH_UNAVAILABLE', message: '暂时无法验证登录状态' }, { status: 503, headers: { 'Cache-Control': 'no-store' } })
      }
    }
    const response = await method(request)
    if (response.status >= 400) {
      await recordSecurityEvent(request, {
        type: 'auth_failure', severity: response.status >= 500 ? 'error' : 'warning', statusCode: response.status,
        identifier, message: '认证接口返回失败响应', metadata: { path },
      })
    } else if (path === '/api/auth/sign-in/email' || path === '/api/auth/passkey/verify-authentication') {
      // Starting an OAuth redirect is not proof of a completed login.
      await recordSecurityEvent(request, {
        type: 'auth_sign_in_success', severity: 'info', statusCode: response.status,
        identifier, message: '登录成功', metadata: { path },
      })
    }
    return response
  }
}

export const GET = wrapAuthHandler(handler.GET)
export const POST = wrapAuthHandler(handler.POST)
export const PUT = wrapAuthHandler(handler.PUT)
export const DELETE = wrapAuthHandler(handler.DELETE)
export const PATCH = wrapAuthHandler(handler.PATCH)

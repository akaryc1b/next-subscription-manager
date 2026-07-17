import { auth } from '@/lib/auth'
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
    return typeof identifier === 'string'
      ? identifier.trim().toLowerCase()
      : undefined
  } catch {
    return undefined
  }
}

function wrapAuthHandler(
  method: (request: Request) => Response | Promise<Response>
) {
  return async function securityAwareAuthHandler(request: NextRequest) {
    const path = new URL(request.url).pathname
    const identifier = await getAuthIdentifier(request)

    if (request.method === 'POST' && path.endsWith('/sign-in/email')) {
      const ipAddress = getClientIp(request)
      const rateLimit = await checkAuthRateLimit(ipAddress, identifier)

      if (rateLimit.limited) {
        await recordSecurityEvent(request, {
          type: 'auth_rate_limited',
          severity: 'warning',
          statusCode: 429,
          identifier,
          message: '登录失败次数过多，已触发限流',
          metadata: {
            reason: 'rate_limited',
            retryAfterSeconds: rateLimit.retryAfterSeconds,
          },
        })

        return NextResponse.json(
          { error: '登录尝试过于频繁，请稍后再试' },
          {
            status: 429,
            headers: {
              'Retry-After': String(rateLimit.retryAfterSeconds),
              'Cache-Control': 'no-store',
            },
          }
        )
      }
    }

    const response = await method(request)

    if (response.status >= 400) {
      await recordSecurityEvent(request, {
        type: 'auth_failure',
        severity: response.status >= 500 ? 'error' : 'warning',
        statusCode: response.status,
        identifier,
        message: '认证接口返回失败响应',
        metadata: {
          path,
        },
      })
    } else if (path.includes('/sign-in')) {
      await recordSecurityEvent(request, {
        type: 'auth_sign_in_success',
        severity: 'info',
        statusCode: response.status,
        identifier,
        message: '登录成功',
        metadata: {
          path,
        },
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

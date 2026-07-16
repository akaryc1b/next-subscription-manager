import { auth } from '@/lib/auth'
import { recordSecurityEvent } from '@/lib/security-events'
import { toNextJsHandler } from 'better-auth/next-js'
import { NextRequest } from 'next/server'

const handler = toNextJsHandler(auth)

async function getAuthIdentifier(request: NextRequest): Promise<string | undefined> {
  if (request.method !== 'POST') return undefined

  try {
    const body = await request.clone().json()
    return body?.email || body?.username || body?.provider
  } catch {
    return undefined
  }
}

function wrapAuthHandler(
  method: (request: Request) => Response | Promise<Response>
) {
  return async function securityAwareAuthHandler(request: NextRequest) {
    const identifier = await getAuthIdentifier(request)
    const response = await method(request)
    const path = new URL(request.url).pathname

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

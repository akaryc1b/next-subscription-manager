import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

type SecurityEventType =
  | 'admin_auth_missing'
  | 'admin_auth_invalid_session'
  | 'admin_auth_forbidden'
  | 'auth_failure'
  | 'auth_sign_in_success'
  | 'activation_token_missing'
  | 'activation_token_invalid'
  | 'activation_token_used'
  | 'activation_token_expired'
  | 'activation_setup_invalid_request'
  | 'activation_setup_rejected'
  | 'activation_setup_success'
  | 'subscription_token_invalid'
  | 'subscription_denied'

type SecuritySeverity = 'info' | 'warning' | 'error' | 'critical'

type SecurityEventInput = {
  type: SecurityEventType
  severity?: SecuritySeverity
  statusCode?: number
  userId?: string
  identifier?: string
  message?: string
  metadata?: Record<string, unknown>
}

export function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for')
  const forwardedIp = forwardedFor?.split(',')[0]?.trim()

  return (
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-real-ip') ||
    forwardedIp ||
    request.headers.get('x-client-ip') ||
    'unknown'
  )
}

export function maskToken(token: string | null | undefined): string | undefined {
  if (!token) return undefined
  return token.length <= 8 ? `${token.slice(0, 2)}***` : `${token.slice(0, 8)}...`
}

export async function recordSecurityEvent(
  request: NextRequest,
  event: SecurityEventInput
) {
  try {
    const url = new URL(request.url)
    const metadata = event.metadata
      ? JSON.parse(JSON.stringify(event.metadata))
      : undefined

    await prisma.securityEvent.create({
      data: {
        type: event.type,
        severity: event.severity || 'info',
        method: request.method,
        path: url.pathname,
        statusCode: event.statusCode,
        ipAddress: getClientIp(request),
        userAgent: request.headers.get('user-agent')?.slice(0, 512),
        userId: event.userId,
        identifier: event.identifier,
        message: event.message,
        metadata,
      },
    })
  } catch (error) {
    console.error('记录安全事件失败:', error)
  }
}

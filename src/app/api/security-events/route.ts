import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/authorization'
import { prisma } from '@/lib/prisma'

const securityEventTypes = [
  'admin_auth_missing',
  'admin_auth_invalid_session',
  'admin_auth_forbidden',
  'auth_failure',
  'auth_sign_in_success',
  'activation_token_missing',
  'activation_token_invalid',
  'activation_token_used',
  'activation_token_expired',
  'activation_setup_invalid_request',
  'activation_setup_rejected',
  'activation_setup_success',
  'subscription_token_invalid',
  'subscription_denied',
] as const

const securitySeverities = ['info', 'warning', 'error', 'critical'] as const

function isSecurityEventType(value: string): value is typeof securityEventTypes[number] {
  return (securityEventTypes as readonly string[]).includes(value)
}

function isSecuritySeverity(value: string): value is typeof securitySeverities[number] {
  return (securitySeverities as readonly string[]).includes(value)
}

function parseDate(value: string | null) {
  if (!value) return undefined
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? undefined : date
}

export async function GET(request: NextRequest) {
  try {
    const adminGuard = await requireAdmin(request)
    if (adminGuard.response) return adminGuard.response

    const { searchParams } = new URL(request.url)
    const limit = Math.min(Math.max(Number(searchParams.get('limit')) || 100, 1), 500)
    const type = searchParams.get('type')?.trim()
    const severity = searchParams.get('severity')?.trim()
    const ipAddress = searchParams.get('ip')?.trim()
    const userId = searchParams.get('userId')?.trim()
    const from = parseDate(searchParams.get('from'))
    const to = parseDate(searchParams.get('to'))

    const where: Record<string, unknown> = {}
    if (type) {
      if (!isSecurityEventType(type)) {
        return NextResponse.json({ error: '安全事件类型无效' }, { status: 400 })
      }
      where.type = type
    }
    if (severity) {
      if (!isSecuritySeverity(severity)) {
        return NextResponse.json({ error: '安全事件级别无效' }, { status: 400 })
      }
      where.severity = severity
    }
    if (ipAddress) where.ipAddress = { contains: ipAddress, mode: 'insensitive' }
    if (userId) where.userId = userId
    if (from || to) where.createdAt = { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) }

    const events = await prisma.securityEvent.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    return NextResponse.json({ events })
  } catch (error) {
    return NextResponse.json(
      { error: '获取安全事件失败' },
      { status: 500 }
    )
  }
}

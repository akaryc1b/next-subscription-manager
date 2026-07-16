import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/authorization'
import { prisma } from '@/lib/prisma'

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
    const from = parseDate(searchParams.get('from'))
    const to = parseDate(searchParams.get('to'))
    const now = new Date()
    const today = new Date(now)
    today.setHours(0, 0, 0, 0)
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const scopedDate = from || to ? { accessedAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}
    const scopedSecurityDate = from || to ? { createdAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}

    const [
      userCount,
      configCount,
      subscriptionCount,
      accessCount,
      securityEventCount,
      todayAccesses,
      last24hAccesses,
      criticalSecurityEvents,
      warningSecurityEvents,
      uniqueIpRows,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.config.count(),
      prisma.subscription.count(),
      prisma.accessLog.count({ where: scopedDate }),
      prisma.securityEvent.count({ where: scopedSecurityDate }),
      prisma.accessLog.count({ where: { accessedAt: { gte: today } } }),
      prisma.accessLog.count({ where: { accessedAt: { gte: last24h } } }),
      prisma.securityEvent.count({ where: { severity: 'critical', ...scopedSecurityDate } }),
      prisma.securityEvent.count({ where: { severity: 'warning', ...scopedSecurityDate } }),
      prisma.accessLog.groupBy({ by: ['ipAddress'], where: scopedDate }),
    ])

    return NextResponse.json({
      stats: {
        users: userCount,
        configs: configCount,
        subscriptions: subscriptionCount,
        accesses: accessCount,
        securityEvents: securityEventCount,
        todayAccesses,
        last24hAccesses,
        criticalSecurityEvents,
        warningSecurityEvents,
        uniqueIps: uniqueIpRows.length,
      },
    })
  } catch (error) {
    return NextResponse.json(
      { error: '获取统计数据失败' },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/authorization'
import { prisma } from '@/lib/prisma'

function parseDate(value: string | null) {
  if (!value) return undefined
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? undefined : date
}

function latestDate(...dates: Array<Date | undefined>) {
  const validDates = dates.filter((date): date is Date => Boolean(date))
  if (validDates.length === 0) return undefined

  return new Date(Math.max(...validDates.map((date) => date.getTime())))
}

function buildAccessDateWhere(from?: Date, to?: Date) {
  return from || to
    ? { accessedAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } }
    : {}
}

function buildSecurityDateWhere(from?: Date, to?: Date) {
  return from || to
    ? { createdAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } }
    : {}
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
    const scopedDate = buildAccessDateWhere(from, to)
    const scopedSecurityDate = buildSecurityDateWhere(from, to)
    const todayDate = buildAccessDateWhere(latestDate(today, from), to)
    const last24hDate = buildAccessDateWhere(latestDate(last24h, from), to)

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
      prisma.config.count({ where: { isActive: true } }),
      prisma.subscription.count(),
      prisma.accessLog.count({ where: scopedDate }),
      prisma.securityEvent.count({ where: scopedSecurityDate }),
      prisma.accessLog.count({ where: todayDate }),
      prisma.accessLog.count({ where: last24hDate }),
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

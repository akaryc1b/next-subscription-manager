import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/authorization'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const adminGuard = await requireAdmin(request)
    if (adminGuard.response) return adminGuard.response

    const [
      userCount,
      configCount,
      subscriptionCount,
      accessCount,
      securityEventCount,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.config.count(),
      prisma.subscription.count(),
      prisma.accessLog.count(),
      prisma.securityEvent.count(),
    ])

    return NextResponse.json({
      stats: {
        users: userCount,
        configs: configCount,
        subscriptions: subscriptionCount,
        accesses: accessCount,
        securityEvents: securityEventCount,
      },
    })
  } catch (error) {
    return NextResponse.json(
      { error: '获取统计数据失败' },
      { status: 500 }
    )
  }
}

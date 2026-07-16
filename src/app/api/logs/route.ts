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
    const limit = Math.min(Math.max(Number(searchParams.get('limit')) || 50, 1), 500)
    const email = searchParams.get('email')?.trim()
    const ipAddress = searchParams.get('ip')?.trim()
    const query = searchParams.get('q')?.trim()
    const from = parseDate(searchParams.get('from'))
    const to = parseDate(searchParams.get('to'))

    const where: Record<string, unknown> = {}
    if (ipAddress) where.ipAddress = { contains: ipAddress, mode: 'insensitive' }
    if (from || to) where.accessedAt = { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) }
    if (email) {
      where.subscription = { user: { email: { contains: email, mode: 'insensitive' } } }
    }
    if (query) {
      where.OR = [
        { ipAddress: { contains: query, mode: 'insensitive' } },
        { userAgent: { contains: query, mode: 'insensitive' } },
        { subscription: { user: { email: { contains: query, mode: 'insensitive' } } } },
        { subscription: { user: { userConfigs: { some: { config: { name: { contains: query, mode: 'insensitive' } } } } } } },
      ]
    }

    const logs = await prisma.accessLog.findMany({
      where,
      orderBy: { accessedAt: 'desc' },
      take: limit,
      include: {
        subscription: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                userConfigs: {
                  include: { config: { select: { name: true, isActive: true } } },
                },
              },
            },
          },
        },
      },
    })

    return NextResponse.json({
      logs: logs.map((log: { id: string; ipAddress: string; userAgent: string | null; accessedAt: Date; subscription: { user: { id: string; email: string; userConfigs: Array<{ config: { name: string; isActive: boolean } }> } } }) => ({
        id: log.id,
        ipAddress: log.ipAddress,
        userAgent: log.userAgent,
        accessedAt: log.accessedAt,
        userId: log.subscription.user.id,
        email: log.subscription.user.email,
        activeConfigNames: log.subscription.user.userConfigs
          .filter((userConfig: { config: { isActive: boolean; name: string } }) => userConfig.config.isActive)
          .map((userConfig: { config: { isActive: boolean; name: string } }) => userConfig.config.name),
      })),
    })
  } catch (error) {
    return NextResponse.json(
      { error: '获取访问日志失败' },
      { status: 500 }
    )
  }
}

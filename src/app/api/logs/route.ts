import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/authorization'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const adminGuard = await requireAdmin(request)
    if (adminGuard.response) return adminGuard.response

    const { searchParams } = new URL(request.url)
    const limit = Math.min(
      Math.max(Number(searchParams.get('limit')) || 50, 1),
      500
    )

    const logs = await prisma.accessLog.findMany({
      orderBy: {
        accessedAt: 'desc',
      },
      take: limit,
      include: {
        subscription: {
          include: {
            user: {
              include: {
                userConfigs: {
                  include: {
                    config: {
                      select: {
                        name: true,
                        isActive: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    })

    return NextResponse.json({ logs })
  } catch (error) {
    return NextResponse.json(
      { error: '获取访问日志失败' },
      { status: 500 }
    )
  }
}

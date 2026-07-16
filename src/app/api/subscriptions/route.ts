import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/authorization'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const adminGuard = await requireAdmin(request)
    if (adminGuard.response) return adminGuard.response

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    const where = userId ? { userId } : {}

    const subscriptions = await prisma.subscription.findMany({
      where,
      include: {
        user: {
          select: {
            email: true,
            isActive: true,
            isBanned: true,
            expiresAt: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json({ subscriptions })
  } catch (error) {
    return NextResponse.json(
      { error: '获取订阅列表失败' },
      { status: 500 }
    )
  }
}

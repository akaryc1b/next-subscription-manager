import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/authorization'
import { prisma } from '@/lib/prisma'
import { randomBytes } from 'crypto'

// POST /api/users/[id]/subscription/reset - 重置订阅链接
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminGuard = await requireAdmin(request)
    if (adminGuard.response) return adminGuard.response

    const { id } = await params

    // 查找用户的订阅
    const subscription = await prisma.subscription.findUnique({
      where: { userId: id },
    })

    if (!subscription) {
      return NextResponse.json(
        { error: '订阅不存在' },
        { status: 404 }
      )
    }

    // 生成新的 token
    const newToken = randomBytes(16).toString('hex')

    // 更新订阅：新 token，访问计数归零
    const updatedSubscription = await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        token: newToken,
        accessCount: 0,
      },
      select: {
        id: true,
        token: true,
        maxAccess: true,
        accessCount: true,
        updatedAt: true,
      },
    })

    // 生成订阅链接
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const subscriptionLink = `${baseUrl}/api/sub/${newToken}`

    return NextResponse.json({
      subscription: updatedSubscription,
      subscriptionLink,
    })
  } catch (error) {
    console.error('重置订阅链接失败:', error)
    return NextResponse.json(
      { error: '重置订阅链接失败' },
      { status: 500 }
    )
  }
}

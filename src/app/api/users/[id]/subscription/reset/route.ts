import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/authorization'
import { prisma } from '@/lib/prisma'
import { generateSubscriptionToken } from '@/lib/subscription-token'

const noStoreHeaders = {
  'Cache-Control': 'private, no-store, max-age=0, must-revalidate',
  Pragma: 'no-cache',
  Expires: '0',
}

// POST /api/users/[id]/subscription/reset - 手动轮换永久订阅 Token
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminGuard = await requireAdmin(request)
    if (adminGuard.response) return adminGuard.response

    const { id } = await params

    const subscription = await prisma.subscription.findUnique({
      where: { userId: id },
      select: { id: true },
    })

    if (!subscription) {
      return NextResponse.json(
        { error: '订阅不存在' },
        { status: 404, headers: noStoreHeaders }
      )
    }

    const tokenRotatedAt = new Date()
    const newToken = generateSubscriptionToken()

    // Token 默认永久有效。管理员手动轮换时只替换 Token；
    // 原 Token 因唯一值已被覆盖而立即失效，访问次数和额度保持不变。
    const updatedSubscription = await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        token: newToken,
        tokenRotatedAt,
      },
      select: {
        id: true,
        token: true,
        tokenRotatedAt: true,
        maxAccess: true,
        accessCount: true,
        updatedAt: true,
      },
    })

    const baseUrl = process.env.BETTER_AUTH_URL || request.nextUrl.origin
    const subscriptionLink = `${baseUrl}/api/sub/${newToken}`

    return NextResponse.json(
      {
        subscription: updatedSubscription,
        subscriptionLink,
        oldTokenInvalidated: true,
        message: '新订阅 Token 已生成，原 Token 已立即失效',
      },
      { headers: noStoreHeaders }
    )
  } catch (error) {
    console.error('轮换订阅 Token 失败:', error)
    return NextResponse.json(
      { error: '轮换订阅 Token 失败' },
      { status: 500, headers: noStoreHeaders }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/authorization'
import { prisma } from '@/lib/prisma'

// PATCH /api/users/[id]/subscription - 更新订阅设置
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminGuard = await requireAdmin(request)
    if (adminGuard.response) return adminGuard.response

    const { id } = await params
    const { maxAccess } = await request.json()

    // 验证 maxAccess 参数
    if (typeof maxAccess !== 'number' || maxAccess < 0) {
      return NextResponse.json(
        { error: '最大访问次数必须是非负整数' },
        { status: 400 }
      )
    }

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

    // 更新订阅设置
    const updatedSubscription = await prisma.subscription.update({
      where: { id: subscription.id },
      data: { maxAccess },
      select: {
        id: true,
        token: true,
        maxAccess: true,
        accessCount: true,
        updatedAt: true,
      },
    })

    return NextResponse.json({ subscription: updatedSubscription })
  } catch (error) {
    console.error('更新订阅设置失败:', error)
    return NextResponse.json(
      { error: '更新订阅设置失败' },
      { status: 500 }
    )
  }
}

// GET /api/users/[id]/subscription - 获取订阅详情
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminGuard = await requireAdmin(request)
    if (adminGuard.response) return adminGuard.response

    const { id } = await params

    const subscription = await prisma.subscription.findUnique({
      where: { userId: id },
      select: {
        id: true,
        token: true,
        maxAccess: true,
        accessCount: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    if (!subscription) {
      return NextResponse.json(
        { error: '订阅不存在' },
        { status: 404 }
      )
    }

    return NextResponse.json({ subscription })
  } catch (error) {
    console.error('获取订阅详情失败:', error)
    return NextResponse.json(
      { error: '获取订阅详情失败' },
      { status: 500 }
    )
  }
}

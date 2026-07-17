import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/authorization'
import { prisma } from '@/lib/prisma'

const noStoreHeaders = {
  'Cache-Control': 'private, no-store, max-age=0, must-revalidate',
  Pragma: 'no-cache',
  Expires: '0',
}

// PATCH /api/users/[id]/subscription - 更新订阅访问额度
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminGuard = await requireAdmin(request)
    if (adminGuard.response) return adminGuard.response

    const { id } = await params
    const { maxAccess } = await request.json()

    if (!Number.isInteger(maxAccess) || maxAccess < 0) {
      return NextResponse.json(
        { error: '最大访问次数必须是非负整数' },
        { status: 400, headers: noStoreHeaders }
      )
    }

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

    const updatedSubscription = await prisma.subscription.update({
      where: { id: subscription.id },
      data: { maxAccess },
      select: {
        id: true,
        token: true,
        tokenRotatedAt: true,
        maxAccess: true,
        accessCount: true,
        updatedAt: true,
      },
    })

    return NextResponse.json(
      { subscription: updatedSubscription },
      { headers: noStoreHeaders }
    )
  } catch (error) {
    console.error('更新订阅设置失败:', error)
    return NextResponse.json(
      { error: '更新订阅设置失败' },
      { status: 500, headers: noStoreHeaders }
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
        tokenRotatedAt: true,
        maxAccess: true,
        accessCount: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    if (!subscription) {
      return NextResponse.json(
        { error: '订阅不存在' },
        { status: 404, headers: noStoreHeaders }
      )
    }

    return NextResponse.json(
      {
        subscription,
        policy: {
          expires: false,
          rotationMode: 'admin_manual',
          oldTokenInvalidation: 'immediate',
        },
      },
      { headers: noStoreHeaders }
    )
  } catch (error) {
    console.error('获取订阅详情失败:', error)
    return NextResponse.json(
      { error: '获取订阅详情失败' },
      { status: 500, headers: noStoreHeaders }
    )
  }
}

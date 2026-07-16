import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/authorization'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const adminGuard = await requireAdmin(request)
    if (adminGuard.response) return adminGuard.response

    const { userId, githubId, email } = await request.json()

    if (!userId || !githubId) {
      return NextResponse.json(
        { error: '参数不完整' },
        { status: 400 }
      )
    }

    // 检查GitHub账号是否已被其他用户绑定
    const existingAccount = await prisma.account.findFirst({
      where: {
        providerId: 'github',
        accountId: githubId,
      },
    })

    if (existingAccount && existingAccount.userId !== userId) {
      return NextResponse.json(
        { error: '该GitHub账号已被其他用户绑定' },
        { status: 400 }
      )
    }

    // 创建或更新Account记录
    // 先查找是否已存在用户的GitHub绑定
    const existingUserAccount = await prisma.account.findFirst({
      where: {
        userId,
        providerId: 'github',
      },
    })

    if (existingUserAccount) {
      // 更新现有记录
      await prisma.account.update({
        where: { id: existingUserAccount.id },
        data: { accountId: githubId },
      })
    } else {
      // 创建新记录
      await prisma.account.create({
        data: {
          userId,
          accountId: githubId,
          providerId: 'github',
        },
      })
    }

    // 更新用户邮箱（如果提供）
    if (email) {
      await prisma.user.update({
        where: { id: userId },
        data: { email },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('GitHub绑定失败:', error)
    return NextResponse.json(
      { error: '绑定失败' },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/authorization'
import { prisma } from '@/lib/prisma'
import { deleteCredentialAccounts, getCredentialAccount } from '@/lib/credential-account'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; type: string }> }
) {
  try {
    const adminGuard = await requireAdmin(request)
    if (adminGuard.response) return adminGuard.response

    const { id: userId, type: authType } = await params

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        accounts: true,
        passkeys: true, // 查询 Passkey 表
      },
    })

    if (!user) {
      return NextResponse.json(
        { error: '用户不存在' },
        { status: 404 }
      )
    }

    // 计算当前认证方式数量
    let authMethodsCount = 0
    const credentialAccount = getCredentialAccount(user.accounts)
    if (credentialAccount) authMethodsCount++
    // Passkey 从 passkeys 表计数
    if (user.passkeys && user.passkeys.length > 0) authMethodsCount++
    // GitHub 从 accounts 表计数
    const githubAccount = user.accounts.find(a => a.providerId === 'github')
    if (githubAccount) authMethodsCount++

    // 至少保留一种认证方式
    if (authMethodsCount <= 1) {
      return NextResponse.json(
        { error: '至少需要保留一种认证方式' },
        { status: 400 }
      )
    }

    // 解绑密码
    if (authType === 'password') {
      if (!credentialAccount) {
        return NextResponse.json(
          { error: '用户未设置密码' },
          { status: 400 }
        )
      }

      await deleteCredentialAccounts(prisma, userId)

      return NextResponse.json({ success: true })
    }

    // 解绑 Passkey（从 passkeys 表删除）
    if (authType === 'passkey') {
      if (!user.passkeys || user.passkeys.length === 0) {
        return NextResponse.json(
          { error: '用户未绑定 Passkey' },
          { status: 400 }
        )
      }

      // 删除该用户的所有 Passkey
      await prisma.passkey.deleteMany({
        where: { userId: userId },
      })

      return NextResponse.json({ success: true })
    }

    // 解绑 GitHub（从 accounts 表删除）
    if (authType === 'github') {
      if (!githubAccount) {
        return NextResponse.json(
          { error: '用户未绑定 GitHub' },
          { status: 400 }
        )
      }

      await prisma.account.delete({
        where: { id: githubAccount.id },
      })

      return NextResponse.json({ success: true })
    }

    return NextResponse.json(
      { error: '不支持的认证类型' },
      { status: 400 }
    )
  } catch (error) {
    return NextResponse.json(
      { error: '解绑失败' },
      { status: 500 }
    )
  }
}

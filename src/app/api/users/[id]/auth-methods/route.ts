import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/authorization'
import { prisma } from '@/lib/prisma'
import { getCredentialAccount } from '@/lib/credential-account'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminGuard = await requireAdmin(request)
    if (adminGuard.response) return adminGuard.response

    const { id: userId } = await params

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        accounts: true,
        activationToken: true,
        passkeys: true, // 查询 Passkey 表
      },
    })

    if (!user) {
      return NextResponse.json(
        { error: '用户不存在' },
        { status: 404 }
      )
    }

    const activated = !user.activationToken || user.activationToken.used

    const methods: any[] = []
    const credentialAccount = getCredentialAccount(user.accounts)

    // 检查密码认证
    if (credentialAccount) {
      methods.push({
        type: 'password',
        enabled: true,
        createdAt: credentialAccount.createdAt,
      })
    }

    // 检查 Passkey（从 passkeys 表查询，而非 accounts 表的 credential）
    if (user.passkeys && user.passkeys.length > 0) {
      methods.push({
        type: 'passkey',
        enabled: true,
        createdAt: user.passkeys[0].createdAt || user.createdAt,
      })
    }

    // 检查 GitHub OAuth（从 accounts 表查询）
    for (const account of user.accounts) {
      if (account.providerId === 'github') {
        methods.push({
          type: 'github',
          enabled: true,
          email: user.email,
          createdAt: account.createdAt,
        })
      }
    }

    return NextResponse.json({
      activated,
      methods,
    })
  } catch (error) {
    return NextResponse.json(
      { error: '获取认证方式失败' },
      { status: 500 }
    )
  }
}

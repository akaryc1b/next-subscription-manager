import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashCredentialPassword, upsertCredentialPassword } from '@/lib/credential-account'
import { maskToken, recordSecurityEvent } from '@/lib/security-events'

export async function POST(request: NextRequest) {
  try {
    const { token, authType, password } = await request.json()

    if (!token || !authType) {
      await recordSecurityEvent(request, {
        type: 'activation_setup_invalid_request',
        severity: 'warning',
        statusCode: 400,
        identifier: maskToken(token),
        message: '激活设置参数不完整',
        metadata: {
          hasToken: Boolean(token),
          authType,
        },
      })

      return NextResponse.json(
        { error: '参数不完整' },
        { status: 400 }
      )
    }

    const activationToken = await prisma.activationToken.findUnique({
      where: { token },
      include: {
        user: true,
      },
    })

    if (!activationToken) {
      await recordSecurityEvent(request, {
        type: 'activation_token_invalid',
        severity: 'warning',
        statusCode: 404,
        identifier: maskToken(token),
        message: '激活设置使用不存在的 token',
        metadata: {
          authType,
        },
      })

      return NextResponse.json(
        { error: '激活令牌不存在' },
        { status: 404 }
      )
    }

    if (activationToken.used) {
      await recordSecurityEvent(request, {
        type: 'activation_token_used',
        severity: 'warning',
        statusCode: 400,
        userId: activationToken.userId,
        identifier: maskToken(token),
        message: '重复使用已消费的激活 token 设置认证',
        metadata: {
          authType,
        },
      })

      return NextResponse.json(
        { error: '激活令牌已使用' },
        { status: 400 }
      )
    }

    if (activationToken.expiresAt < new Date()) {
      await recordSecurityEvent(request, {
        type: 'activation_token_expired',
        severity: 'warning',
        statusCode: 400,
        userId: activationToken.userId,
        identifier: maskToken(token),
        message: '使用已过期的激活 token 设置认证',
        metadata: {
          authType,
        },
      })

      return NextResponse.json(
        { error: '激活令牌已过期' },
        { status: 400 }
      )
    }

    if (authType === 'password') {
      if (!password || password.length < 6) {
        await recordSecurityEvent(request, {
          type: 'activation_setup_rejected',
          severity: 'info',
          statusCode: 400,
          userId: activationToken.userId,
          identifier: maskToken(token),
          message: '激活设置密码不符合规则',
          metadata: {
            authType,
          },
        })

        return NextResponse.json(
          { error: '密码至少6个字符' },
          { status: 400 }
        )
      }

      const hashedPassword = await hashCredentialPassword(password)

      await prisma.$transaction(async tx => {
        await upsertCredentialPassword(tx, activationToken.userId, hashedPassword)
        await tx.activationToken.update({
          where: { id: activationToken.id },
          data: { used: true },
        })
      })

      await recordSecurityEvent(request, {
        type: 'activation_setup_success',
        severity: 'info',
        statusCode: 200,
        userId: activationToken.userId,
        identifier: maskToken(token),
        message: '激活设置成功',
        metadata: {
          authType,
        },
      })

      return NextResponse.json({ success: true })
    }

    if (authType === 'passkey') {
      await recordSecurityEvent(request, {
        type: 'activation_setup_rejected',
        severity: 'info',
        statusCode: 501,
        userId: activationToken.userId,
        identifier: maskToken(token),
        message: '激活设置请求未实现的认证方式',
        metadata: {
          authType,
        },
      })

      // Passkey设置需要WebAuthn流程，暂时返回未实现
      return NextResponse.json(
        { error: 'Passkey功能即将推出' },
        { status: 501 }
      )
    }

    await recordSecurityEvent(request, {
      type: 'activation_setup_rejected',
      severity: 'warning',
      statusCode: 400,
      userId: activationToken.userId,
      identifier: maskToken(token),
      message: '激活设置请求不支持的认证类型',
      metadata: {
        authType,
      },
    })

    return NextResponse.json(
      { error: '不支持的认证类型' },
      { status: 400 }
    )
  } catch (error) {
    return NextResponse.json(
      { error: '设置失败' },
      { status: 500 }
    )
  }
}

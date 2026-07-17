import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { maskToken, recordSecurityEvent } from '@/lib/security-events'

const noStoreHeaders = {
  'Cache-Control': 'no-store, max-age=0',
  Pragma: 'no-cache',
  Expires: '0',
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      await recordSecurityEvent(request, {
        type: 'activation_token_missing',
        severity: 'warning',
        statusCode: 400,
        message: '激活验证缺少 token',
      })

      return NextResponse.json(
        { error: '激活令牌无效' },
        { status: 400, headers: noStoreHeaders }
      )
    }

    const activationToken = await prisma.activationToken.findUnique({
      where: { token },
      include: {
        user: {
          select: {
            username: true,
            name: true,
            email: true,
          },
        },
      },
    })

    if (!activationToken) {
      await recordSecurityEvent(request, {
        type: 'activation_token_invalid',
        severity: 'warning',
        statusCode: 404,
        identifier: maskToken(token),
        message: '激活验证使用不存在的 token',
      })

      return NextResponse.json(
        { error: '激活令牌不存在' },
        { status: 404, headers: noStoreHeaders }
      )
    }

    if (activationToken.used) {
      await recordSecurityEvent(request, {
        type: 'activation_token_used',
        severity: 'warning',
        statusCode: 400,
        userId: activationToken.userId,
        identifier: maskToken(token),
        message: '重复使用已消费的激活 token',
      })

      return NextResponse.json(
        { error: '激活令牌已使用' },
        { status: 400, headers: noStoreHeaders }
      )
    }

    if (activationToken.expiresAt < new Date()) {
      await recordSecurityEvent(request, {
        type: 'activation_token_expired',
        severity: 'warning',
        statusCode: 400,
        userId: activationToken.userId,
        identifier: maskToken(token),
        message: '使用已过期的激活 token',
      })

      return NextResponse.json(
        { error: '激活令牌已过期' },
        { status: 400, headers: noStoreHeaders }
      )
    }

    const emailName = activationToken.user.email.split('@')[0]
    const displayName = activationToken.user.name
      || activationToken.user.username
      || emailName

    return NextResponse.json(
      {
        displayName,
        email: activationToken.user.email,
      },
      { headers: noStoreHeaders }
    )
  } catch (error) {
    console.error('验证激活令牌失败:', error)
    return NextResponse.json(
      { error: '验证失败' },
      { status: 500, headers: noStoreHeaders }
    )
  }
}

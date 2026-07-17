import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { hashCredentialPassword, upsertCredentialPassword } from '@/lib/credential-account'
import { maskToken, recordSecurityEvent } from '@/lib/security-events'

const activationSetupSchema = z.object({
  token: z.string().min(32),
  authType: z.literal('password'),
  password: z.string().min(12, '密码至少 12 个字符').max(128, '密码最多 128 个字符'),
})

const noStoreHeaders = {
  'Cache-Control': 'no-store, max-age=0',
  Pragma: 'no-cache',
  Expires: '0',
}

export async function POST(request: NextRequest) {
  let token: string | undefined

  try {
    const body = await request.json()
    token = typeof body?.token === 'string' ? body.token : undefined
    const parsed = activationSetupSchema.safeParse(body)

    if (!parsed.success) {
      await recordSecurityEvent(request, {
        type: 'activation_setup_invalid_request',
        severity: 'warning',
        statusCode: 400,
        identifier: maskToken(token),
        message: '激活设置参数无效',
        metadata: {
          issue: parsed.error.issues[0]?.message,
        },
      })

      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || '请求参数无效' },
        { status: 400, headers: noStoreHeaders }
      )
    }

    const { password } = parsed.data
    token = parsed.data.token

    const activationToken = await prisma.activationToken.findUnique({
      where: { token },
      select: {
        id: true,
        userId: true,
        used: true,
        expiresAt: true,
      },
    })

    if (!activationToken) {
      await recordSecurityEvent(request, {
        type: 'activation_token_invalid',
        severity: 'warning',
        statusCode: 404,
        identifier: maskToken(token),
        message: '激活设置使用不存在的 token',
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
        message: '重复使用已消费的激活 token 设置认证',
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
        message: '使用已过期的激活 token 设置认证',
      })

      return NextResponse.json(
        { error: '激活令牌已过期' },
        { status: 400, headers: noStoreHeaders }
      )
    }

    const passwordHash = await hashCredentialPassword(password)
    const now = new Date()

    const activated = await prisma.$transaction(async tx => {
      const consumed = await tx.activationToken.updateMany({
        where: {
          id: activationToken.id,
          used: false,
          expiresAt: { gt: now },
        },
        data: { used: true },
      })

      if (consumed.count !== 1) {
        return false
      }

      await upsertCredentialPassword(tx, activationToken.userId, passwordHash)
      return true
    })

    if (!activated) {
      await recordSecurityEvent(request, {
        type: 'activation_setup_rejected',
        severity: 'warning',
        statusCode: 409,
        userId: activationToken.userId,
        identifier: maskToken(token),
        message: '激活 token 在并发请求中已消费或过期',
      })

      return NextResponse.json(
        { error: '激活令牌已失效，请重新获取激活链接' },
        { status: 409, headers: noStoreHeaders }
      )
    }

    await recordSecurityEvent(request, {
      type: 'activation_setup_success',
      severity: 'info',
      statusCode: 200,
      userId: activationToken.userId,
      identifier: maskToken(token),
      message: '激活设置成功',
      metadata: {
        authType: 'password',
      },
    })

    return NextResponse.json(
      {
        success: true,
        next: '/login?activated=1',
      },
      { headers: noStoreHeaders }
    )
  } catch (error) {
    console.error('设置激活密码失败:', error)
    return NextResponse.json(
      { error: '设置失败' },
      { status: 500, headers: noStoreHeaders }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { recordSecurityEvent } from '@/lib/security-events'

type AdminUser = {
  id: string
  role: string
  isActive: boolean
  isBanned: boolean
}

type AdminGuardResult =
  | { response: NextResponse; user?: never }
  | { response: null; user: AdminUser }

export async function requireAdmin(request: NextRequest): Promise<AdminGuardResult> {
  const session = await auth.api.getSession({
    headers: request.headers,
    query: {
      disableCookieCache: true,
    },
  })

  if (!session?.user?.id) {
    await recordSecurityEvent(request, {
      type: 'admin_auth_missing',
      severity: 'warning',
      statusCode: 401,
      message: '未登录访问管理员接口',
    })

    return {
      response: NextResponse.json(
        { error: '请先登录' },
        { status: 401 }
      ),
    }
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      role: true,
      isActive: true,
      isBanned: true,
    },
  })

  if (!user) {
    await recordSecurityEvent(request, {
      type: 'admin_auth_invalid_session',
      severity: 'warning',
      statusCode: 401,
      userId: session.user.id,
      message: '会话用户不存在',
    })

    return {
      response: NextResponse.json(
        { error: '登录状态无效' },
        { status: 401 }
      ),
    }
  }

  if (user.role !== 'admin' || !user.isActive || user.isBanned) {
    await recordSecurityEvent(request, {
      type: 'admin_auth_forbidden',
      severity: 'critical',
      statusCode: 403,
      userId: user.id,
      message: '非管理员或异常账号访问管理员接口',
      metadata: {
        role: user.role,
        isActive: user.isActive,
        isBanned: user.isBanned,
      },
    })

    return {
      response: NextResponse.json(
        { error: '无权访问' },
        { status: 403 }
      ),
    }
  }

  return {
    response: null,
    user,
  }
}

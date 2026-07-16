import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/authorization'
import { prisma } from '@/lib/prisma'
import { hashCredentialPassword, upsertCredentialPassword } from '@/lib/credential-account'
import { randomBytes } from 'crypto'
import { formatZodError, paginationQuerySchema, userCreateSchema } from '@/lib/api-schemas'
import { z } from 'zod'

export async function GET(request: NextRequest) {
  try {
    const adminGuard = await requireAdmin(request)
    if (adminGuard.response) return adminGuard.response

    // 获取搜索参数
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const pagination = paginationQuerySchema.parse(Object.fromEntries(searchParams))
    const page = Number(pagination.page)
    const pageSize = Number(pagination.pageSize)
    const where = search
      ? { email: { contains: search, mode: 'insensitive' as const } }
      : undefined

    const [users, total] = await prisma.$transaction([
      prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        isBanned: true,
        expiresAt: true,
        createdAt: true,
        updatedAt: true,
        subscription: {
          select: {
            token: true,
            maxAccess: true,
            accessCount: true,
          },
        },
        userConfigs: {
          select: {
            configId: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
      prisma.user.count({ where }),
    ])

    return NextResponse.json({ users, pagination: { page, pageSize, total, pageCount: Math.ceil(Number(total) / pageSize) } })
  } catch (error) {
    return NextResponse.json(
      { error: '获取用户列表失败' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const adminGuard = await requireAdmin(request)
    if (adminGuard.response) return adminGuard.response

    const { email, password, role: normalizedRole, expiresAt, configIds } = userCreateSchema.parse(await request.json())

    const isAdmin = normalizedRole === 'admin'

    if (isAdmin && !password) {
      return NextResponse.json(
        { error: '管理员必须设置密码' },
        { status: 400 }
      )
    }

    const hashedPassword = isAdmin && password
      ? await hashCredentialPassword(password)
      : null

    const token = randomBytes(16).toString('hex')
    const activationToken = randomBytes(32).toString('hex')
    const activationExpiresAt = new Date()
    activationExpiresAt.setDate(activationExpiresAt.getDate() + 7)

    const user = await prisma.$transaction(async tx => {
      const createdUser = await tx.user.create({
        data: {
          email,
          role: normalizedRole,
          expiresAt: expiresAt ?? null,
          subscription: {
            create: {
              token,
            },
          },
          userConfigs: configIds?.length ? {
            create: configIds.map((configId: string) => ({ configId })),
          } : undefined,
          activationToken: !isAdmin ? {
            create: {
              token: activationToken,
              expiresAt: activationExpiresAt,
            },
          } : undefined,
        },
        select: {
          id: true,
          email: true,
          role: true,
          isActive: true,
          isBanned: true,
          expiresAt: true,
          createdAt: true,
          subscription: {
            select: {
              token: true,
              maxAccess: true,
              accessCount: true,
            },
          },
          userConfigs: {
            select: {
              configId: true,
            },
          },
          activationToken: {
            select: {
              token: true,
              expiresAt: true,
            },
          },
        },
      })

      if (hashedPassword) {
        await upsertCredentialPassword(tx, createdUser.id, hashedPassword)
      }

      return createdUser
    })

    const baseUrl = process.env.BETTER_AUTH_URL || request.nextUrl.origin
    const activationLink = !isAdmin && user.activationToken
      ? `${baseUrl}/activate?token=${user.activationToken.token}`
      : null

    return NextResponse.json({
      user,
      activationLink,
    })
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: formatZodError(error) }, { status: 400 })
    }
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002') {
      return NextResponse.json(
        { error: '该邮箱已被使用' },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: '创建用户失败' },
      { status: 500 }
    )
  }
}

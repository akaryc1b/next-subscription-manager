import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/authorization'
import { prisma } from '@/lib/prisma'
import { hashCredentialPassword, upsertCredentialPassword } from '@/lib/credential-account'
import { formatZodError, paginationQuerySchema, userCreateSchema } from '@/lib/api-schemas'
import { generateSubscriptionToken } from '@/lib/subscription-token'
import { z } from 'zod'

const publicUserSelect = {
  id: true, email: true, role: true, isActive: true, isBanned: true,
  expiresAt: true, createdAt: true, updatedAt: true,
  subscription: { select: { tokenRotatedAt: true, maxAccess: true, accessCount: true } },
  userConfigs: { select: { configId: true } },
} as const

export async function GET(request: NextRequest) {
  try {
    const guard = await requireAdmin(request)
    if (guard.response) return guard.response
    const { searchParams } = request.nextUrl
    const search = searchParams.get('search')
    const { page, pageSize } = paginationQuerySchema.parse(Object.fromEntries(searchParams))
    const where = search ? { email: { contains: search, mode: 'insensitive' as const } } : undefined
    const [users, total] = await prisma.$transaction([
      prisma.user.findMany({ where, select: publicUserSelect, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], skip: (page - 1) * pageSize, take: pageSize }),
      prisma.user.count({ where }),
    ])
    return NextResponse.json({ users, pagination: { page, pageSize, total, pageCount: Math.ceil(total / pageSize) } }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: formatZodError(error) }, { status: 400 })
    return NextResponse.json({ error: '获取用户列表失败' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const guard = await requireAdmin(request)
    if (guard.response) return guard.response
    const { email, password, role, expiresAt, configIds } = userCreateSchema.parse(await request.json())
    const passwordHash = role === 'admin' && password ? await hashCredentialPassword(password) : null
    const token = generateSubscriptionToken()
    const user = await prisma.$transaction(async tx => {
      const created = await tx.user.create({
        data: {
          email, role, expiresAt: expiresAt ?? null,
          subscription: { create: { token } },
          userConfigs: configIds.length ? { create: configIds.map(configId => ({ configId })) } : undefined,
        },
        select: publicUserSelect,
      })
      // Subscriber records carry subscription authorization, not a login identity.
      if (passwordHash) await upsertCredentialPassword(tx, created.id, passwordHash)
      return created
    })
    return NextResponse.json({ user }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error: unknown) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: formatZodError(error) }, { status: 400 })
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002') return NextResponse.json({ error: '该邮箱已被使用' }, { status: 400 })
    return NextResponse.json({ error: '创建用户失败' }, { status: 500 })
  }
}

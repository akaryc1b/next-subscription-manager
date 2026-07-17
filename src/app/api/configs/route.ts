import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/authorization'
import { prisma } from '@/lib/prisma'
import { configCreateSchema, formatZodError, paginationQuerySchema } from '@/lib/api-schemas'
import { z } from 'zod'

export async function GET(request: NextRequest) {
  try {
    const adminGuard = await requireAdmin(request)
    if (adminGuard.response) return adminGuard.response

    const { searchParams } = new URL(request.url)
    const pagination = paginationQuerySchema.parse(Object.fromEntries(searchParams))
    const page = Number(pagination.page)
    const pageSize = Number(pagination.pageSize)
    const search = searchParams.get('search')?.trim()
    const includeContent = searchParams.get('includeContent') === 'true'
    const where = search
      ? { name: { contains: search, mode: 'insensitive' as const } }
      : undefined

    const [configs, total] = await prisma.$transaction([
      prisma.config.findMany({
      where,
      select: {
        id: true,
        userId: true,
        name: true,
        content: includeContent,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        user: { select: { email: true } },
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
      prisma.config.count({ where }),
    ])

    return NextResponse.json({ configs, pagination: { page, pageSize, total, pageCount: Math.ceil(Number(total) / pageSize) } })
  } catch (error) {
    return NextResponse.json(
      { error: '获取配置列表失败' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const adminGuard = await requireAdmin(request)
    if (adminGuard.response) return adminGuard.response

    const { userId, name, content } = configCreateSchema.parse(await request.json())

    const config = await prisma.config.create({
      data: {
        userId,
        name,
        content,
      },
      include: {
        user: {
          select: {
            email: true,
          },
        },
      },
    })

    return NextResponse.json({ config })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: formatZodError(error) }, { status: 400 })
    }
    return NextResponse.json(
      { error: '创建配置失败' },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/authorization'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const adminGuard = await requireAdmin(request)
    if (adminGuard.response) return adminGuard.response

    const configs = await prisma.config.findMany({
      include: {
        user: {
          select: {
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json({ configs })
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

    const { userId, name, content } = await request.json()

    if (!userId || !name || !content) {
      return NextResponse.json(
        { error: '用户ID、名称和内容不能为空' },
        { status: 400 }
      )
    }

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
    return NextResponse.json(
      { error: '创建配置失败' },
      { status: 500 }
    )
  }
}

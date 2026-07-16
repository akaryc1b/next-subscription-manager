import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/authorization'
import { prisma } from '@/lib/prisma'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminGuard = await requireAdmin(request)
    if (adminGuard.response) return adminGuard.response

    const { name, content, isActive } = await request.json()
    const { id } = await params

    const data: any = {}
    if (name) data.name = name
    if (content) data.content = content
    if (typeof isActive === 'boolean') data.isActive = isActive

    const config = await prisma.config.update({
      where: { id },
      data,
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
      { error: '更新配置失败' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminGuard = await requireAdmin(request)
    if (adminGuard.response) return adminGuard.response

    const { id } = await params

    await prisma.config.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: '删除配置失败' },
      { status: 500 }
    )
  }
}

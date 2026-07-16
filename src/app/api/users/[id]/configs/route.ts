import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/authorization'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminGuard = await requireAdmin(request)
    if (adminGuard.response) return adminGuard.response

    const { id } = await params

    const userConfigs = await prisma.userConfig.findMany({
      where: { userId: id },
      include: {
        config: {
          select: {
            id: true,
            name: true,
            isActive: true,
          },
        },
      },
    })

    return NextResponse.json({ configs: userConfigs.map(uc => uc.config) })
  } catch (error) {
    return NextResponse.json(
      { error: '获取用户配置失败' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminGuard = await requireAdmin(request)
    if (adminGuard.response) return adminGuard.response

    const { id } = await params
    const { configId } = await request.json()

    if (!configId) {
      return NextResponse.json(
        { error: '配置ID不能为空' },
        { status: 400 }
      )
    }

    await prisma.userConfig.create({
      data: {
        userId: id,
        configId,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: '该配置已分配给此用户' },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: '分配配置失败' },
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
    const { searchParams } = new URL(request.url)
    const configId = searchParams.get('configId')

    if (!configId) {
      return NextResponse.json(
        { error: '配置ID不能为空' },
        { status: 400 }
      )
    }

    await prisma.userConfig.delete({
      where: {
        userId_configId: {
          userId: id,
          configId,
        },
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: '移除配置失败' },
      { status: 500 }
    )
  }
}

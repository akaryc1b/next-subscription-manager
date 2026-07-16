import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/authorization'
import { prisma } from '@/lib/prisma'
import { hashCredentialPassword, upsertCredentialPassword } from '@/lib/credential-account'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminGuard = await requireAdmin(request)
    if (adminGuard.response) return adminGuard.response

    const { email, password, role, isActive, isBanned, expiresAt, configIds } = await request.json()
    const { id } = await params

    const data: any = {}
    if (email) {
      // 简单的邮箱格式验证
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) {
        return NextResponse.json(
          { error: '邮箱格式无效' },
          { status: 400 }
        )
      }
      data.email = email
    }
    const passwordHash = password ? await hashCredentialPassword(password) : null
    if (role) data.role = role
    if (typeof isActive === 'boolean') data.isActive = isActive
    if (typeof isBanned === 'boolean') data.isBanned = isBanned
    if (expiresAt !== undefined) data.expiresAt = expiresAt ? new Date(expiresAt) : null

    const user = await prisma.$transaction(async tx => {
      if (configIds !== undefined) {
        await tx.userConfig.deleteMany({
          where: { userId: id },
        })
        if (configIds.length > 0) {
          await tx.userConfig.createMany({
            data: configIds.map((configId: string) => ({ userId: id, configId })),
          })
        }
      }

      const updatedUser = await tx.user.update({
        where: { id },
        data,
        select: {
          id: true,
          email: true,
          role: true,
          isActive: true,
          isBanned: true,
          expiresAt: true,
          updatedAt: true,
          userConfigs: {
            select: {
              configId: true,
            },
          },
        },
      })

      if (passwordHash) {
        await upsertCredentialPassword(tx, id, passwordHash)
        await tx.activationToken.updateMany({
          where: { userId: id },
          data: { used: true },
        })
      }

      return updatedUser
    })

    return NextResponse.json({ user })
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: '该邮箱已被使用' },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: '更新用户失败' },
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

    await prisma.user.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: '删除用户失败' },
      { status: 500 }
    )
  }
}

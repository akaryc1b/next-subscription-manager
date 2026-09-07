import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/authorization'
import { prisma } from '@/lib/prisma'
import { hashCredentialPassword, upsertCredentialPassword } from '@/lib/credential-account'
import { formatZodError, userUpdateSchema } from '@/lib/api-schemas'
import { z } from 'zod'

async function hasAnotherActiveAdmin(userId: string) {
  return (await prisma.user.count({ where: { id: { not: userId }, role: 'admin', isActive: true, isBanned: false } })) > 0
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const adminGuard = await requireAdmin(request)
    if (adminGuard.response) return adminGuard.response
    const { email, password, role, isActive, isBanned, expiresAt, configIds } = userUpdateSchema.parse(await request.json())
    const { id } = await params
    const currentUser = await prisma.user.findUnique({ where: { id }, select: { id: true, role: true, isActive: true, isBanned: true } })
    if (!currentUser) return NextResponse.json({ error: '用户不存在' }, { status: 404 })
    const nextRole = role ?? currentUser.role
    const promoting = currentUser.role !== 'admin' && nextRole === 'admin'
    if (password && nextRole !== 'admin') return NextResponse.json({ error: '订阅用户不能设置登录密码' }, { status: 400 })
    if (promoting && !password) return NextResponse.json({ error: '设为管理员时必须设置新密码' }, { status: 400 })
    const nextIsActive = isActive ?? currentUser.isActive
    const nextIsBanned = isBanned ?? currentUser.isBanned
    const removesAdminAccess = currentUser.role === 'admin' && (nextRole !== 'admin' || !nextIsActive || nextIsBanned)
    if (id === adminGuard.user.id && removesAdminAccess) return NextResponse.json({ error: '不能降级、禁用或封禁当前登录的管理员账号' }, { status: 400 })
    if (removesAdminAccess && !(await hasAnotherActiveAdmin(id))) return NextResponse.json({ error: '系统必须保留至少一个可用管理员账号' }, { status: 400 })

    const data: Record<string, unknown> = {}
    if (email !== undefined) data.email = email
    const passwordHash = password ? await hashCredentialPassword(password) : null
    if (role !== undefined) data.role = role
    if (typeof isActive === 'boolean') data.isActive = isActive
    if (typeof isBanned === 'boolean') data.isBanned = isBanned
    if (expiresAt !== undefined) data.expiresAt = expiresAt
    const invalidateSessions = email !== undefined || Boolean(passwordHash) || role !== undefined || isActive !== undefined || isBanned !== undefined
    const user = await prisma.$transaction(async tx => {
      if (configIds !== undefined) {
        await tx.userConfig.deleteMany({ where: { userId: id } })
        if (configIds.length > 0) await tx.userConfig.createMany({ data: configIds.map(configId => ({ userId: id, configId })) })
      }
      const updatedUser = await tx.user.update({ where: { id }, data, select: {
        id: true, email: true, role: true, isActive: true, isBanned: true, expiresAt: true, updatedAt: true,
        userConfigs: { select: { configId: true } },
      } })
      if (promoting) {
        // Never promote subscriber-controlled legacy credentials or passkeys.
        await tx.account.deleteMany({ where: { userId: id } })
        await tx.passkey.deleteMany({ where: { userId: id } })
      }
      if (passwordHash) {
        await upsertCredentialPassword(tx, id, passwordHash)
        await tx.activationToken.updateMany({ where: { userId: id }, data: { used: true } })
      }
      if (invalidateSessions) await tx.session.deleteMany({ where: { userId: id } })
      return updatedUser
    })
    return NextResponse.json({ user, sessionsRevoked: invalidateSessions })
  } catch (error: unknown) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: formatZodError(error) }, { status: 400 })
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002') return NextResponse.json({ error: '该邮箱已被使用' }, { status: 400 })
    return NextResponse.json({ error: '更新用户失败' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const adminGuard = await requireAdmin(request)
    if (adminGuard.response) return adminGuard.response
    const { id } = await params
    if (id === adminGuard.user.id) return NextResponse.json({ error: '不能删除当前登录的管理员账号' }, { status: 400 })
    const targetUser = await prisma.user.findUnique({ where: { id }, select: { role: true, isActive: true, isBanned: true } })
    if (!targetUser) return NextResponse.json({ error: '用户不存在' }, { status: 404 })
    if (targetUser.role === 'admin' && targetUser.isActive && !targetUser.isBanned && !(await hasAnotherActiveAdmin(id))) return NextResponse.json({ error: '不能删除系统中最后一个可用管理员账号' }, { status: 400 })
    await prisma.user.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch { return NextResponse.json({ error: '删除用户失败' }, { status: 500 }) }
}

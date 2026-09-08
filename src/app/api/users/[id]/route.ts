import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { requireAdmin } from '@/lib/authorization'
import { canAdminLogin, type LoginAccount } from '@/lib/admin-login-policy'
import { prisma } from '@/lib/prisma'
import { hashCredentialPassword, upsertCredentialPassword } from '@/lib/credential-account'
import { formatZodError, userUpdateSchema } from '@/lib/api-schemas'
import { z } from 'zod'

class UserMutationError extends Error {
  constructor(message: string, readonly status = 400) { super(message) }
}

async function lockUsersForMutation(tx: Prisma.TransactionClient, actorId: string, targetId: string) {
  // Lock in stable order to serialize role changes and revalidate the caller.
  // Never authorize a promotion from a standalone pre-transaction lookup.
  const users = await tx.$queryRaw<(LoginAccount & { id: string })[]>`
    SELECT id, role::text AS role, is_active AS "isActive", is_banned AS "isBanned"
    FROM users WHERE id IN (${actorId}, ${targetId}) ORDER BY id FOR UPDATE
  `
  if (!canAdminLogin(users.find(user => user.id === actorId))) throw new UserMutationError('无权访问', 403)
  const target = users.find(user => user.id === targetId)
  if (!target) throw new UserMutationError('用户不存在', 404)
  return target
}

async function hasAnotherActiveAdmin(tx: Prisma.TransactionClient, userId: string) {
  return (await tx.user.count({ where: { id: { not: userId }, role: 'admin', isActive: true, isBanned: false } })) > 0
}

const noStore = { 'Cache-Control': 'private, no-store' }
function mutationFailure(error: unknown, fallback: string) {
  if (error instanceof UserMutationError) return NextResponse.json({ error: error.message }, { status: error.status, headers: noStore })
  if (error instanceof z.ZodError) return NextResponse.json({ error: formatZodError(error) }, { status: 400, headers: noStore })
  if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002') return NextResponse.json({ error: '该邮箱已被使用' }, { status: 400, headers: noStore })
  return NextResponse.json({ error: fallback }, { status: 500, headers: noStore })
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const adminGuard = await requireAdmin(request)
    if (adminGuard.response) return adminGuard.response
    const { email, password, role, isActive, isBanned, expiresAt, configIds } = userUpdateSchema.parse(await request.json())
    const { id } = await params
    // Hash outside the transaction; eligibility and promotion are decided inside.
    const passwordHash = password ? await hashCredentialPassword(password) : null
    const data: Record<string, unknown> = {}
    if (email !== undefined) data.email = email
    if (role !== undefined) data.role = role
    if (typeof isActive === 'boolean') data.isActive = isActive
    if (typeof isBanned === 'boolean') data.isBanned = isBanned
    if (expiresAt !== undefined) data.expiresAt = expiresAt
    const invalidateSessions = email !== undefined || Boolean(passwordHash) || role !== undefined || isActive !== undefined || isBanned !== undefined
    const user = await prisma.$transaction(async tx => {
      const currentUser = await lockUsersForMutation(tx, adminGuard.user.id, id)
      const nextRole = role ?? currentUser.role
      const promoting = currentUser.role !== 'admin' && nextRole === 'admin'
      if (passwordHash && nextRole !== 'admin') throw new UserMutationError('订阅用户不能设置登录密码')
      if (promoting && !passwordHash) throw new UserMutationError('设为管理员时必须设置新密码')
      const nextIsActive = isActive ?? currentUser.isActive
      const nextIsBanned = isBanned ?? currentUser.isBanned
      const removesAdminAccess = currentUser.role === 'admin' && (nextRole !== 'admin' || !nextIsActive || nextIsBanned)
      if (id === adminGuard.user.id && removesAdminAccess) throw new UserMutationError('不能降级、禁用或封禁当前登录的管理员账号')
      if (removesAdminAccess && !(await hasAnotherActiveAdmin(tx, id))) throw new UserMutationError('系统必须保留至少一个可用管理员账号')
      if (configIds !== undefined) {
        await tx.userConfig.deleteMany({ where: { userId: id } })
        if (configIds.length > 0) await tx.userConfig.createMany({ data: configIds.map(configId => ({ userId: id, configId })) })
      }
      const updatedUser = await tx.user.update({ where: { id }, data, select: {
        id: true, email: true, role: true, isActive: true, isBanned: true, expiresAt: true, updatedAt: true,
        userConfigs: { select: { configId: true } },
      } })
      if (promoting) {
        await tx.account.deleteMany({ where: { userId: id } })
        await tx.passkey.deleteMany({ where: { userId: id } })
      }
      if (passwordHash) {
        await upsertCredentialPassword(tx, id, passwordHash)
        await tx.activationToken.updateMany({ where: { userId: id }, data: { used: true } })
      }
      if (invalidateSessions) await tx.session.deleteMany({ where: { userId: id } })
      return updatedUser
    }, { maxWait: 5000, timeout: 10000 })
    return NextResponse.json({ user, sessionsRevoked: invalidateSessions }, { headers: noStore })
  } catch (error: unknown) { return mutationFailure(error, '更新用户失败') }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const adminGuard = await requireAdmin(request)
    if (adminGuard.response) return adminGuard.response
    const { id } = await params
    await prisma.$transaction(async tx => {
      const targetUser = await lockUsersForMutation(tx, adminGuard.user.id, id)
      if (id === adminGuard.user.id) throw new UserMutationError('不能删除当前登录的管理员账号')
      if (canAdminLogin(targetUser) && !(await hasAnotherActiveAdmin(tx, id))) throw new UserMutationError('不能删除系统中最后一个可用管理员账号')
      await tx.user.delete({ where: { id } })
    }, { maxWait: 5000, timeout: 10000 })
    return NextResponse.json({ success: true }, { headers: noStore })
  } catch (error: unknown) { return mutationFailure(error, '删除用户失败') }
}

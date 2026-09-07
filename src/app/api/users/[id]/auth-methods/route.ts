import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/authorization'
import { prisma } from '@/lib/prisma'
import { getCredentialAccount } from '@/lib/credential-account'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requireAdmin(request)
    if (guard.response) return guard.response
    const { id } = await params
    const user = await prisma.user.findUnique({ where: { id }, include: { accounts: true, passkeys: true } })
    if (!user) return NextResponse.json({ error: '用户不存在' }, { status: 404 })
    const headers = { 'Cache-Control': 'private, no-store' }
    if (user.role !== 'admin') return NextResponse.json({ loginAllowed: false, methods: [] }, { headers })
    const methods: { type: string; enabled: boolean; createdAt: Date; email?: string }[] = []
    const credential = getCredentialAccount(user.accounts)
    if (credential) methods.push({ type: 'password', enabled: true, createdAt: credential.createdAt })
    if (user.passkeys.length) methods.push({ type: 'passkey', enabled: true, createdAt: user.passkeys[0].createdAt || user.createdAt })
    for (const account of user.accounts) {
      if (account.providerId === 'github') methods.push({ type: 'github', enabled: true, email: user.email, createdAt: account.createdAt })
    }
    return NextResponse.json({ loginAllowed: user.isActive && !user.isBanned, methods }, { headers })
  } catch { return NextResponse.json({ error: '获取认证方式失败' }, { status: 500 }) }
}

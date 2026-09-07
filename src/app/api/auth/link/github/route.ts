import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/authorization'

export async function POST(request: NextRequest) {
  const guard = await requireAdmin(request)
  if (guard.response) return guard.response
  return NextResponse.json({ error: '请在账户设置中通过 GitHub 授权绑定', code: 'MANUAL_LINK_DISABLED' }, {
    status: 410, headers: { 'Cache-Control': 'no-store' },
  })

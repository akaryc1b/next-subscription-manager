import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/authorization'
import { prisma } from '@/lib/prisma'

function parseDate(value: string | null) {
  if (!value) return undefined
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? undefined : date
}

export async function GET(request: NextRequest) {
  try {
    const adminGuard = await requireAdmin(request)
    if (adminGuard.response) return adminGuard.response

    const { searchParams } = new URL(request.url)
    const limit = Math.min(Math.max(Number(searchParams.get('limit')) || 100, 1), 500)
    const type = searchParams.get('type')?.trim()
    const severity = searchParams.get('severity')?.trim()
    const ipAddress = searchParams.get('ip')?.trim()
    const userId = searchParams.get('userId')?.trim()
    const from = parseDate(searchParams.get('from'))
    const to = parseDate(searchParams.get('to'))

    const where: Record<string, unknown> = {}
    if (type) where.type = { contains: type, mode: 'insensitive' }
    if (severity) where.severity = severity
    if (ipAddress) where.ipAddress = { contains: ipAddress, mode: 'insensitive' }
    if (userId) where.userId = userId
    if (from || to) where.createdAt = { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) }

    const events = await prisma.securityEvent.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    return NextResponse.json({ events })
  } catch (error) {
    return NextResponse.json(
      { error: '获取安全事件失败' },
      { status: 500 }
    )
  }
}

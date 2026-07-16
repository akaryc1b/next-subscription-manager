import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/authorization'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const adminGuard = await requireAdmin(request)
    if (adminGuard.response) return adminGuard.response

    const { searchParams } = new URL(request.url)
    const limit = Math.min(
      Math.max(Number(searchParams.get('limit')) || 100, 1),
      500
    )
    const type = searchParams.get('type')
    const severity = searchParams.get('severity')
    const ipAddress = searchParams.get('ip')
    const userId = searchParams.get('userId')

    const where: any = {}
    if (type) where.type = type
    if (severity) where.severity = severity
    if (ipAddress) where.ipAddress = ipAddress
    if (userId) where.userId = userId

    const events = await prisma.securityEvent.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
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

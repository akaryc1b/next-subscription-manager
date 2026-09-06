import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { requireAdmin } from '@/lib/authorization'
import { prisma } from '@/lib/prisma'
import { accountFilters, DAY, securityCopy, type Activity } from '@/lib/workspace'

export const dynamic = 'force-dynamic'
const accountSelect = {
  id: true, email: true, role: true, isActive: true, isBanned: true, expiresAt: true, createdAt: true,
  subscription: { select: { accessCount: true, maxAccess: true, tokenRotatedAt: true } },
  userConfigs: { select: { configId: true, config: { select: { id: true, name: true, isActive: true } } }, orderBy: { createdAt: 'asc' as const } },
} satisfies Prisma.UserSelect
const profileSelect = {
  id: true, userId: true, name: true, isActive: true, createdAt: true, updatedAt: true,
  user: { select: { email: true } }, _count: { select: { userConfigs: true } },
} satisfies Prisma.ConfigSelect
function json(data: unknown, status = 200) { return NextResponse.json(data, { status, headers: { 'Cache-Control': 'private, no-store' } }) }
function accountWhere(filter: string, now: Date): Prisma.UserWhereInput {
  const enabled: Prisma.UserWhereInput = { role: 'user', isActive: true, isBanned: false }
  const expiring: Prisma.UserWhereInput = { ...enabled, expiresAt: { gte: now, lte: new Date(now.getTime() + 7 * DAY) } }
  const expired: Prisma.UserWhereInput = { ...enabled, expiresAt: { lt: now } }
  const unassigned: Prisma.UserWhereInput = { ...enabled, userConfigs: { none: { config: { isActive: true } } } }
  const exhausted: Prisma.UserWhereInput = { ...enabled, subscription: { is: { maxAccess: { gt: 0 }, accessCount: { gte: prisma.subscription.fields.maxAccess } } } }
  switch (filter) {
    case 'attention': return { OR: [expiring, expired, unassigned, exhausted] }
    case 'expiring': return expiring
    case 'expired': return expired
    case 'unassigned': return unassigned
    case 'exhausted': return exhausted
    case 'paused': return { isActive: false }
    case 'blocked': return { isBanned: true }
    default: return {}
  }
}
async function activity(from: Date, to: Date, limit: number, kind = 'all', query = '', userId = ''): Promise<Activity[]> {
  const logsWhere: Prisma.AccessLogWhereInput = {
    accessedAt: { gte: from, lte: to },
    ...(userId ? { subscription: { userId } } : {}),
    ...(query ? { OR: [{ ipAddress: { contains: query, mode: 'insensitive' } }, { subscription: { user: { email: { contains: query, mode: 'insensitive' } } } }] } : {}),
  }
  const eventsWhere: Prisma.SecurityEventWhereInput = {
    createdAt: { gte: from, lte: to }, ...(userId ? { userId } : {}),
    ...(query ? { OR: [{ ipAddress: { contains: query, mode: 'insensitive' } }, { message: { contains: query, mode: 'insensitive' } }] } : {}),
  }
  const [logs, events] = await Promise.all([
    kind === 'security' ? [] : prisma.accessLog.findMany({ where: logsWhere, take: limit, orderBy: { accessedAt: 'desc' }, select: { id: true, accessedAt: true, ipAddress: true, userAgent: true, subscription: { select: { user: { select: { id: true, email: true } } } } } }),
    kind === 'delivery' ? [] : prisma.securityEvent.findMany({ where: eventsWhere, take: limit, orderBy: { createdAt: 'desc' }, select: { id: true, createdAt: true, type: true, severity: true, metadata: true, userId: true, ipAddress: true, userAgent: true, statusCode: true } }),
  ])
  const items: Activity[] = logs.map(log => ({
    id: `delivery-${log.id}`, kind: 'delivery', at: log.accessedAt.toISOString(), title: '订阅内容已返回',
    detail: log.subscription.user.email, email: log.subscription.user.email, tone: 'good',
    userId: log.subscription.user.id, ip: log.ipAddress, agent: log.userAgent, status: 200,
    nextStep: '服务端已返回内容；这不代表客户端已经导入，也不代表节点连通。',
  }))
  for (const event of events) {
    const reason = event.metadata && typeof event.metadata === 'object' && !Array.isArray(event.metadata) ? event.metadata.reason : undefined
    items.push({ id: `security-${event.id}`, kind: 'security', at: event.createdAt.toISOString(), ...securityCopy(event.type, reason),
      tone: event.severity === 'critical' || event.severity === 'error' ? 'bad' : event.severity === 'warning' ? 'warn' : 'accent',
      userId: event.userId, ip: event.ipAddress, agent: event.userAgent, status: event.statusCode })
  }
  return items.sort((a, b) => b.at.localeCompare(a.at)).slice(0, limit)
}
export async function GET(request: NextRequest) {
  try {
    const guard = await requireAdmin(request)
    if (guard.response) return guard.response
    const params = request.nextUrl.searchParams
    const view = params.get('view') || 'overview'
    const page = Number(params.get('page') || 1)
    const pageSize = Number(params.get('pageSize') || 20)
    if (!Number.isInteger(page) || page < 1 || page > 100000 || !Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) return json({ error: '分页参数无效' }, 400)
    const q = (params.get('q') || '').trim().slice(0, 200)
    const now = new Date()
    const pagination = (total: number) => ({ page, pageSize, total, pageCount: Math.ceil(total / pageSize) })
    if (view === 'accounts') {
      const filter = params.get('filter') || 'all'
      if (!accountFilters.some(([key]) => key === filter)) return json({ error: '账户筛选条件无效' }, 400)
      const where: Prisma.UserWhereInput = { AND: [accountWhere(filter, now), ...(q ? [{ email: { contains: q, mode: 'insensitive' as const } }] : []), ...(params.get('id') ? [{ id: params.get('id')! }] : [])] }
      const [users, total] = await prisma.$transaction([
        prisma.user.findMany({ where, select: accountSelect, orderBy: [{ expiresAt: { sort: 'asc', nulls: 'last' } }, { id: 'asc' }], skip: (page - 1) * pageSize, take: pageSize }),
        prisma.user.count({ where }),
      ])
      return json({ users, pagination: pagination(total), asOf: now.toISOString() })
    }
    if (view === 'configs') {
      const where: Prisma.ConfigWhereInput = q ? { name: { contains: q, mode: 'insensitive' } } : {}
      const [configs, total] = await prisma.$transaction([
        prisma.config.findMany({ where, select: profileSelect, orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }], skip: (page - 1) * pageSize, take: pageSize }),
        prisma.config.count({ where }),
      ])
      return json({ configs, pagination: pagination(total) })
    }
    if (view === 'config') {
      const id = params.get('id')
      if (!id) return json({ error: '缺少配置 ID' }, 400)
      const config = await prisma.config.findUnique({ where: { id }, select: { ...profileSelect, content: true } })
      return config ? json({ config }) : json({ error: '该配置已不存在' }, 404)
    }
    if (view === 'activity') {
      const from = params.get('from') ? new Date(params.get('from')!) : new Date(now.getTime() - 7 * DAY)
      const to = params.get('to') ? new Date(params.get('to')!) : now
      const kind = params.get('kind') || 'all'
      if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to || to.getTime() - from.getTime() > 31 * DAY || !['all', 'delivery', 'security'].includes(kind)) return json({ error: '请选择不超过 31 天的有效时间范围' }, 400)
      const items = await activity(from, to, 100, kind, q, params.get('userId') || '')
      return json({ items, limit: 100, from: from.toISOString(), to: to.toISOString(), asOf: now.toISOString() })
    }
    if (view !== 'overview') return json({ error: '视图不存在' }, 400)
    const last24h = new Date(now.getTime() - DAY)
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) - 6 * DAY)
    const [accounts, configs, attentionCount, expiring, deliveries, security, queue, events, trend] = await Promise.all([
      prisma.user.count({ where: { role: 'user' } }), prisma.config.count({ where: { isActive: true } }),
      prisma.user.count({ where: accountWhere('attention', now) }), prisma.user.count({ where: accountWhere('expiring', now) }),
      prisma.accessLog.count({ where: { accessedAt: { gte: last24h, lte: now } } }),
      prisma.securityEvent.count({ where: { createdAt: { gte: last24h, lte: now }, severity: { in: ['warning', 'error', 'critical'] } } }),
      prisma.user.findMany({ where: accountWhere('attention', now), select: accountSelect, orderBy: [{ expiresAt: { sort: 'asc', nulls: 'last' } }, { id: 'asc' }], take: 5 }),
      activity(last24h, now, 6),
      Promise.all(Array.from({ length: 7 }, async (_, index) => {
        const from = new Date(start.getTime() + index * DAY)
        const until = new Date(Math.min(from.getTime() + DAY, now.getTime()))
        return { date: from.toISOString().slice(0, 10), count: await prisma.accessLog.count({ where: { accessedAt: { gte: from, lt: until } } }) }
      })),
    ])
    return json({ asOf: now.toISOString(), counts: { accounts, configs, attention: attentionCount, expiring, deliveries, security }, attention: queue, trend, activity: events })
  } catch (error) {
    console.error('Workspace query failed', error)
    return json({ error: '暂时无法读取工作台数据，请稍后重试。' }, 500)
  }
}

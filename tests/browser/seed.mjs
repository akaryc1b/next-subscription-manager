import { PrismaClient } from '@prisma/client'
import { hashPassword } from 'better-auth/crypto'
import { randomBytes } from 'node:crypto'

// This script refuses any non-local/non-test database. It never touches deployment data.
const database = new URL(process.env.DATABASE_URL || 'invalid:')
if (process.env.WORKSPACE_E2E !== '1' || !['localhost', '127.0.0.1'].includes(database.hostname) || database.pathname !== '/workspace_e2e') {
  throw new Error('Browser fixtures require WORKSPACE_E2E=1 and a local workspace_e2e database.')
}
const prisma = new PrismaClient()
const day = 86400000
const now = Date.now()
try {
  const admin = await prisma.user.create({ data: {
    email: process.env.E2E_ADMIN_EMAIL, name: 'Orbit 验收管理员', role: 'admin', emailVerified: true,
    accounts: { create: { accountId: 'orbit-e2e-admin', providerId: 'credential', password: await hashPassword(process.env.E2E_ADMIN_PASSWORD) } },
  } })
  const profiles = []
  for (const [name, isActive] of [['日常使用 · 主配置', true], ['远程办公 · 备用配置', true], ['归档配置', false]]) {
    profiles.push(await prisma.config.create({ data: { userId: admin.id, name, isActive, content: 'mixed-port: 7890\nproxies: []\nrules:\n  - MATCH,DIRECT\n' } }))
  }
  const accounts = []
  const fixtures = [
    ['lin.design', 2, 8, 20, true, false, true],
    ['chen.remote', 5, 12, 20, true, false, true],
    ['zhou.studio', -1, 3, 20, true, false, true],
    ['wang.quota', 30, 20, 20, true, false, true],
    ['xu.config', null, 0, 20, true, false, false],
    ['li.ready', null, 0, 0, true, false, true],
    ['sun.paused', null, 1, 20, false, false, true],
    ['wu.blocked', null, 1, 20, true, true, true],
    ['quota.test', null, 1, 3, true, false, true],
    ['long-name-for-responsive-layout-verification', 90, 5, 100, true, false, true],
  ]
  for (const [name, days, accessCount, maxAccess, isActive, isBanned, assigned] of fixtures) {
    accounts.push(await prisma.user.create({ data: {
      email: `${name}@example.test`, name, role: 'user', isActive, isBanned,
      expiresAt: days === null ? null : new Date(now + days * day),
      subscription: { create: { token: randomBytes(32).toString('hex'), accessCount, maxAccess } },
      userConfigs: assigned ? { create: [{ configId: profiles[0].id }, { configId: profiles[1].id }] } : undefined,
    }, include: { subscription: true } }))
  }
  const ready = accounts.find(account => account.email === 'li.ready@example.test')
  const start = new Date(now); start.setUTCHours(0, 0, 0, 0)
  const amounts = [12, 19, 15, 29, 24, 35, 21]
  const logs = amounts.flatMap((count, index) => Array.from({ length: count }, (_, offset) => ({
    subscriptionId: ready.subscription.id,
    ipAddress: offset % 2 ? '192.0.2.21' : '198.51.100.8',
    userAgent: 'Orbit browser acceptance fixture',
    accessedAt: new Date(Math.min(start.getTime() - (6 - index) * day + (offset + 1) * 1800000, now - 10000 - offset * 1000)),
  })))
  await prisma.accessLog.createMany({ data: logs })
  await prisma.subscription.update({ where: { id: ready.subscription.id }, data: { accessCount: logs.length } })
  await prisma.securityEvent.createMany({ data: [
    { type: 'subscription_denied', severity: 'warning', method: 'GET', path: '/api/sub/[redacted]', statusCode: 403, ipAddress: '192.0.2.15', userId: accounts[2].id, message: '过期用户的订阅被访问', metadata: { reason: 'subscription_expired' }, createdAt: new Date(now - 900000) },
    { type: 'subscription_denied', severity: 'warning', method: 'GET', path: '/api/sub/[redacted]', statusCode: 403, ipAddress: '198.51.100.4', userId: accounts[3].id, message: '访问次数达到上限', metadata: { reason: 'access_limit_exceeded' }, createdAt: new Date(now - 1800000) },
  ] })
  console.log('Created isolated browser acceptance fixtures; no production data used.')
} finally {
  await prisma.$disconnect()
}

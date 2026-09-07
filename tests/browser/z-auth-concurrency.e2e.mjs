import { test, expect } from '@playwright/test'
import { PrismaClient } from '@prisma/client'
import { tsImport } from 'tsx/esm/api'
import { hashPassword, verifyPassword } from 'better-auth/crypto'
import { randomUUID, createHmac } from 'node:crypto'

const database = new URL(process.env.DATABASE_URL || 'invalid:')
if (process.env.WORKSPACE_E2E !== '1' || !['localhost', '127.0.0.1'].includes(database.hostname) || database.pathname !== '/workspace_e2e') throw new Error('Concurrency fixtures require local workspace_e2e.')
const db = new PrismaClient()
const owned = []
let previousPrisma
let auth
let context
const origin = 'http://localhost:3000'

test.beforeAll(async () => {
  previousPrisma = globalThis.prisma
  globalThis.prisma = db
  auth = (await tsImport('../../src/lib/auth.ts', import.meta.url)).auth
  context = await auth.$context
})
test.afterAll(async () => {
  await db.user.deleteMany({ where: { id: { in: owned } } })
  await db.$disconnect()
  if (previousPrisma === undefined) delete globalThis.prisma
  else globalThis.prisma = previousPrisma
})
async function user() {
  const value = await db.user.create({ data: { email: `auth-lock-${randomUUID()}@example.test`, role: 'admin', name: 'Original name' } })
  owned.push(value.id)
  return value
}

for (const operation of ['account-create', 'account-update', 'session-create']) {
  test(`${operation} waits for an in-flight revocation and rejects the committed state`, async () => {
    const owner = await user()
    let binding
    if (operation === 'account-update') binding = await db.account.create({ data: { userId: owner.id, providerId: 'github', accountId: randomUUID(), accessToken: 'unchanged-fixture-token' } })
    let release
    let announce
    const gate = new Promise(resolve => { release = resolve })
    const ready = new Promise(resolve => { announce = resolve })
    const revocation = db.$transaction(async tx => {
      await tx.user.update({ where: { id: owner.id }, data: { isActive: false } })
      const [{ pid }] = await tx.$queryRaw`SELECT pg_backend_pid() AS pid`
      announce(pid)
      await gate
    }, { timeout: 15000 })
    let writing
    let completed = false
    try {
      const blocker = await ready
      const execute = operation === 'account-create'
        ? () => context.adapter.create({ model: 'account', data: { userId: owner.id, providerId: 'github', accountId: randomUUID(), accessToken: 'must-not-be-written', createdAt: new Date(), updatedAt: new Date() } })
        : operation === 'account-update'
          ? () => context.adapter.update({ model: 'account', where: [{ field: 'id', value: binding.id }], update: { accessToken: 'must-not-be-written' } })
          : () => context.internalAdapter.createSession(owner.id)
      writing = execute().then(value => { completed = true; return { value } }, error => { completed = true; return { error } })
      // Observe a real PostgreSQL waiter, rather than assuming a sleep caused a race.
      await expect.poll(async () => {
        const [{ blocked }] = await db.$queryRaw`
          SELECT EXISTS (
            SELECT 1 FROM pg_stat_activity AS activity
            WHERE ${blocker}::integer = ANY(pg_blocking_pids(activity.pid))
          ) AS blocked
        `
        return blocked
      }, { timeout: 5000, intervals: [50, 100, 200] }).toBe(true)
      expect(completed).toBe(false)
      release()
      await revocation
      const result = await writing
      expect(result.error?.body?.code).toBe('ADMIN_ONLY')
      expect(await db.session.count({ where: { userId: owner.id } })).toBe(0)
      const bindings = await db.account.findMany({ where: { userId: owner.id } })
      expect(bindings).toHaveLength(binding ? 1 : 0)
      if (binding) expect(bindings[0].accessToken).toBe('unchanged-fixture-token')
    } finally {
      release()
      await revocation
      if (writing) await writing
    }
  })
}

test('eligible admin profile and password HTTP writes remain functional', async () => {
  const owner = await user()
  const originalPassword = 'Original-auth-lock-password-2026!'
  const nextPassword = 'New-auth-lock-password-2026!'
  await db.account.create({ data: { userId: owner.id, providerId: 'credential', accountId: owner.id, password: await hashPassword(originalPassword) } })
  const session = await context.internalAdapter.createSession(owner.id)
  const signature = createHmac('sha256', process.env.BETTER_AUTH_SECRET).update(session.token).digest('base64')
  const headers = { origin, 'content-type': 'application/json', cookie: `${context.authCookies.sessionToken.name}=${encodeURIComponent(`${session.token}.${signature}`)}` }
  const profile = await auth.handler(new Request(`${origin}/api/auth/update-user`, { method: 'POST', headers, body: JSON.stringify({ name: 'Updated administrator' }) }))
  expect(profile.status, await profile.clone().text()).toBe(200)
  expect((await db.user.findUniqueOrThrow({ where: { id: owner.id } })).name).toBe('Updated administrator')
  const password = await auth.handler(new Request(`${origin}/api/auth/change-password`, { method: 'POST', headers, body: JSON.stringify({ currentPassword: originalPassword, newPassword: nextPassword, revokeOtherSessions: false }) }))
  expect(password.status, await password.clone().text()).toBe(200)
  const credential = await db.account.findFirstOrThrow({ where: { userId: owner.id, providerId: 'credential' } })
  expect(await verifyPassword({ hash: credential.password, password: nextPassword })).toBe(true)
  expect(await verifyPassword({ hash: credential.password, password: originalPassword })).toBe(false)
})

test('nested guarded operations use the same rollback boundary', async () => {
  const owner = await user()
  await expect(context.adapter.transaction(async tx => {
    await tx.update({ model: 'user', where: [{ field: 'id', value: owner.id }], update: { name: 'Must roll back' } })
    await tx.create({ model: 'account', data: { userId: owner.id, providerId: 'github', accountId: randomUUID(), createdAt: new Date(), updatedAt: new Date() } })
    throw new Error('deliberate-fixture-rollback')
  })).rejects.toThrow('deliberate-fixture-rollback')
  expect((await db.user.findUniqueOrThrow({ where: { id: owner.id } })).name).toBe('Original name')
  expect(await db.account.count({ where: { userId: owner.id } })).toBe(0)
})

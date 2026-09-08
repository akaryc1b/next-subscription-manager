import { test, expect } from '@playwright/test'
import { PrismaClient } from '@prisma/client'
import { hashPassword, verifyPassword } from 'better-auth/crypto'
import { randomBytes, randomUUID, createHmac } from 'node:crypto'
import { readFile, readdir } from 'node:fs/promises'

const database = new URL(process.env.DATABASE_URL || 'invalid:')
if (process.env.WORKSPACE_E2E !== '1' || !['localhost', '127.0.0.1'].includes(database.hostname) || database.pathname !== '/workspace_e2e') throw new Error('Boundary tests require the isolated local workspace_e2e database.')
const db = new PrismaClient()
const owned = []
const origin = 'http://localhost:3000'
const password = 'Boundary-original-password-2026!'
const newPassword = 'Boundary-new-password-2026!'
const pages = ['/dashboard', '/users', '/configs', '/monitor', '/calendar', '/settings']
let cookieTemplate
let target
let config
let marker

async function fixture(data = {}) {
  const user = await db.user.create({ data: { email: `boundary-${randomUUID()}@example.test`, name: 'Boundary fixture', ...data } })
  owned.push(user.id)
  return user
}
async function installSession(page, userId, expired = false) {
  const token = randomBytes(32).toString('hex')
  const session = await db.session.create({ data: { userId, token, expiresAt: new Date(Date.now() + (expired ? -60000 : 3600000)) } })
  const signature = createHmac('sha256', process.env.BETTER_AUTH_SECRET).update(token).digest('base64')
  await page.context().addCookies([{ ...cookieTemplate, value: encodeURIComponent(`${token}.${signature}`) }])
  return session
}
async function snapshot(id) {
  return db.user.findUnique({ where: { id }, include: { accounts: { orderBy: { id: 'asc' } }, passkeys: { orderBy: { id: 'asc' } }, subscription: true, userConfigs: { orderBy: { configId: 'asc' } }, configs: { orderBy: { id: 'asc' } } } })
}
function cases() {
  const user = `/api/users/${target.id}`
  return [
    ['GET', '/api/users'], ['GET', '/api/subscriptions'],
    ['GET', '/api/configs?includeContent=true'], ['GET', '/api/logs'],
    ['GET', '/api/security-events'], ['GET', '/api/stats'],
    ...['overview', 'accounts', 'configs', 'activity'].map(view => ['GET', `/api/workspace?view=${view}`]),
    ['GET', `/api/workspace?view=config&id=${config.id}`],
    ['GET', `${user}/configs`], ['GET', `${user}/auth-methods`], ['GET', `${user}/subscription`],
    ['POST', '/api/users', { email: `${marker}@example.test` }],
    ['PUT', user, { email: `${marker}-changed@example.test` }], ['DELETE', user],
    ['POST', '/api/configs', { userId: target.id, name: 'Must not exist', content: 'rules: []' }],
    ['PUT', `/api/configs/${config.id}`, { name: 'Must not change', content: 'rules: []' }],
    ['DELETE', `/api/configs/${config.id}`],
    ['POST', `${user}/configs`, { configId: config.id }],
    ['DELETE', `${user}/configs?configId=${config.id}`],
    ['DELETE', `${user}/auth-methods/github`],
    ['PATCH', `${user}/subscription`, { maxAccess: 999 }],
    ['POST', `${user}/subscription/reset`, {}],
    ['POST', '/api/auth/link/github', { userId: target.id, githubId: 'must-not-bind' }],
  ]
}

test.beforeAll(async () => {
  const state = JSON.parse(await readFile('tests/browser/.auth/state.json', 'utf8'))
  cookieTemplate = state.cookies.find(cookie => cookie.name.endsWith('.session_token'))
  expect(cookieTemplate).toBeTruthy()
  const [token, signature] = decodeURIComponent(cookieTemplate.value).split('.')
  expect(createHmac('sha256', process.env.BETTER_AUTH_SECRET).update(token).digest('base64')).toBe(signature)
  target = await fixture({ role: 'admin' })
  marker = `boundary-secret-${randomUUID()}`
  config = await db.config.create({ data: { userId: target.id, name: marker, content: `# ${marker}\nmixed-port: 7890\nrules:\n  - MATCH,DIRECT\n` } })
  await db.subscription.create({ data: { userId: target.id, token: randomBytes(32).toString('hex'), maxAccess: 20, accessCount: 2 } })
  await db.userConfig.create({ data: { userId: target.id, configId: config.id } })
  await db.account.createMany({ data: [
    { userId: target.id, accountId: target.id, providerId: 'credential', password: await hashPassword(password) },
    { userId: target.id, accountId: randomUUID(), providerId: 'github', accessToken: marker },
  ] })
})
test.afterAll(async () => {
  await db.securityEvent.deleteMany({ where: { userId: { in: owned } } })
  await db.user.deleteMany({ where: { id: { in: owned } } })
  await db.$disconnect()
})

test('every management route and HTTP method is represented in the denial matrix', async () => {
  async function routes(directory) {
    const result = []
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = `${directory}/${entry.name}`
      if (entry.isDirectory()) result.push(...await routes(path))
      else if (entry.name === 'route.ts') result.push(path)
    }
    return result
  }
  const actual = []
  const separate = new Set(['src/app/api/auth/[...all]/route.ts', 'src/app/api/activate/verify/route.ts', 'src/app/api/activate/setup/route.ts', 'src/app/api/sub/[token]/route.ts'])
  for (const path of await routes('src/app/api')) {
    if (separate.has(path)) continue
    const source = await readFile(path, 'utf8')
    for (const match of source.matchAll(/export\s+(?:async\s+function|const)\s+(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\b/g)) {
      actual.push(`${match[1]} ${path.replace('src/app', '').replace('/route.ts', '')}`)
    }
  }
  const covered = cases().map(([method, path]) => `${method} ${path.split('?')[0].replaceAll(target.id, '[id]').replaceAll(config.id, '[id]').replace('/auth-methods/github', '/auth-methods/[type]')}`)
  expect([...new Set(covered)].sort()).toEqual(actual.sort())
})

for (const identity of ['anonymous', 'forged cookie', 'subscriber', 'demoted admin', 'disabled admin', 'banned admin', 'expired session', 'deleted account']) {
  test(`${identity}: all management APIs and pages deny access without data or side effects`, async ({ page }) => {
    const before = await snapshot(target.id)
    let user
    let session
    if (identity === 'forged cookie') {
      await page.context().addCookies([{ ...cookieTemplate, value: 'unsigned-administrator-session' }])
    } else if (identity !== 'anonymous') {
      user = await fixture({ role: identity === 'subscriber' ? 'user' : 'admin' })
      session = await installSession(page, user.id, identity === 'expired session')
      if (identity === 'demoted admin') await db.user.update({ where: { id: user.id }, data: { role: 'user' } })
      if (identity === 'disabled admin') await db.user.update({ where: { id: user.id }, data: { isActive: false } })
      if (identity === 'banned admin') await db.user.update({ where: { id: user.id }, data: { isBanned: true } })
      if (identity === 'deleted account') await db.user.delete({ where: { id: user.id } })
    }
    const status = ['subscriber', 'demoted admin', 'disabled admin', 'banned admin'].includes(identity) ? 403 : 401
    for (const [method, path, data] of cases()) {
      const response = await page.request.fetch(path, { method, headers: { origin }, ...(data ? { data } : {}) })
      expect(response.status(), `${identity}: ${method} ${path}`).toBe(status)
      const body = await response.json()
      expect(Object.keys(body)).toEqual(['error'])
      expect(JSON.stringify(body)).not.toContain(marker)
      expect(JSON.stringify(body)).not.toContain(before.subscription.token)
    }
    expect(await snapshot(target.id)).toEqual(before)
    expect(await db.user.findUnique({ where: { email: `${marker}@example.test` } })).toBeNull()
    for (const path of pages) {
      for (const headers of [{}, { RSC: '1' }, { RSC: '1', 'Next-Router-Prefetch': '1' }]) {
        const response = await page.request.get(path, { headers, maxRedirects: 0 })
        const text = await response.text()
        const destination = response.headers().location || text
        expect([200, 307, 308]).toContain(response.status())
        if (headers['Next-Router-Prefetch'] && response.status() === 200 && !text.includes('NEXT_REDIRECT')) {
          // Next 15 omits rendering dynamic routes from automatic prefetch.
          // Accept only the exact route skeleton, never page/session props.
          expect(response.headers()['content-type']).toContain('text/x-component')
          const records = text.trim().split('\n')
          expect(records).toHaveLength(1)
          expect(records[0].startsWith('0:')).toBe(true)
          const payload = JSON.parse(records[0].slice(2))
          expect(payload).toEqual({
            b: expect.any(String),
            f: [[['', { children: ['(dashboard)', { children: [path.slice(1), { children: ['__PAGE__', {}] }] }] }, '$undefined', '$undefined', true], null, [null, null], true]],
            S: false,
          })
        } else {
          expect(destination).toContain('/login')
          if (response.status() === 200) expect(text).toContain('NEXT_REDIRECT')
        }
        for (const secret of [marker, target.email, before.subscription.token, user?.email, session?.id].filter(Boolean)) expect(text).not.toContain(secret)
      }
      // Exercise actual browser navigation for every page, not only prefetch.
      await page.goto(path)
      await expect(page).toHaveURL(/\/login(?:\?|$)/)
      await expect(page.locator('.o-sidebar')).toHaveCount(0)
      await expect(page.getByRole('navigation', { name: '主导航' })).toHaveCount(0)
    }
  })
}

test('an active administrator can read the real canary and render every management page', async ({ page }) => {
  await installSession(page, target.id)
  for (const [method, path] of cases().filter(([method]) => method === 'GET')) {
    expect((await page.request.get(path)).status(), `${method} ${path}`).toBe(200)
  }
  const response = await page.request.get(`/api/workspace?view=config&id=${config.id}`)
  expect((await response.json()).config.content).toContain(marker)
  for (const path of pages) {
    await page.goto(path)
    await expect(page).toHaveURL(new RegExp(`${path}$`))
    await expect(page.locator('.o-sidebar')).toBeVisible()
  }
})

// Hold a real PostgreSQL UPDATE, observe the HTTP request waiting for its row
// lock, then commit. No timer-only race, mock auth, or production database.
async function duringRevocation(userId, data, send) {
  let release
  let announce
  const gate = new Promise(resolve => { release = resolve })
  const ready = new Promise(resolve => { announce = resolve })
  const revocation = db.$transaction(async tx => {
    await tx.user.update({ where: { id: userId }, data })
    const [{ pid }] = await tx.$queryRaw`SELECT pg_backend_pid() AS pid`
    announce(pid)
    await gate
  }, { timeout: 15000 })
  let request
  let completed = false
  try {
    const blocker = await ready
    request = send().then(response => { completed = true; return response })
    await expect.poll(async () => {
      const [{ blocked }] = await db.$queryRaw`SELECT EXISTS (SELECT 1 FROM pg_stat_activity AS activity WHERE ${blocker}::integer = ANY(pg_blocking_pids(activity.pid))) AS blocked`
      return blocked
    }, { timeout: 5000, intervals: [50, 100, 200] }).toBe(true)
    expect(completed).toBe(false)
    release()
    await revocation
    return await request
  } finally {
    release()
    await revocation
    if (request) await request
  }
}

for (const operation of ['role without password', 'role with new password', 'password without role']) {
  test(`concurrent demotion: ${operation} uses the locked current role`, async ({ page }) => {
    await installSession(page, target.id)
    const user = await fixture({ role: 'admin' })
    const oldHash = await hashPassword(password)
    await db.account.createMany({ data: [
      { userId: user.id, providerId: 'credential', accountId: user.id, password: oldHash },
      { userId: user.id, providerId: 'github', accountId: randomUUID() },
    ] })
    await db.passkey.create({ data: { id: randomUUID(), userId: user.id, publicKey: 'test-only', credentialID: randomUUID(), counter: 0, deviceType: 'singleDevice', backedUp: false } })
    await db.session.create({ data: { userId: user.id, token: randomUUID(), expiresAt: new Date(Date.now() + 3600000) } })
    const subscription = await db.subscription.create({ data: { userId: user.id, token: randomUUID() } })
    const payload = operation === 'role without password' ? { role: 'admin' } : operation === 'role with new password' ? { role: 'admin', password: newPassword } : { password: newPassword }
    const response = await duringRevocation(user.id, { role: 'user' }, () => page.request.put(`/api/users/${user.id}`, { data: payload }))
    expect(response.status()).toBe(operation === 'role with new password' ? 200 : 400)
    const current = await snapshot(user.id)
    if (operation === 'role with new password') {
      expect(current.role).toBe('admin')
      expect(current.accounts).toHaveLength(1)
      expect(current.accounts[0].providerId).toBe('credential')
      expect(await verifyPassword({ hash: current.accounts[0].password, password: newPassword })).toBe(true)
      expect(await verifyPassword({ hash: current.accounts[0].password, password })).toBe(false)
      expect(current.passkeys).toHaveLength(0)
      expect(await db.session.count({ where: { userId: user.id } })).toBe(0)
    } else {
      expect(current.role).toBe('user')
      expect(current.accounts).toHaveLength(2)
      expect(current.accounts.find(account => account.providerId === 'credential').password).toBe(oldHash)
    }
    expect(current.subscription.token).toBe(subscription.token)
  })
}

for (const method of ['PUT', 'DELETE']) {
  test(`${method}: an initiating administrator revoked while waiting cannot mutate another account`, async ({ page }) => {
    const actor = await fixture({ role: 'admin' })
    await installSession(page, actor.id)
    const before = await snapshot(target.id)
    const response = await duringRevocation(actor.id, { role: 'user' }, () => page.request.fetch(`/api/users/${target.id}`, { method, ...(method === 'PUT' ? { data: { isBanned: true } } : {}) }))
    expect(response.status()).toBe(403)
    expect(await snapshot(target.id)).toEqual(before)
  })
}

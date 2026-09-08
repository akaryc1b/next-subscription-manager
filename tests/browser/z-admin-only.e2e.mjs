import { test, expect } from '@playwright/test'
import { PrismaClient } from '@prisma/client'
import { hashPassword } from 'better-auth/crypto'
import { randomBytes, randomUUID, createHmac } from 'node:crypto'
import { readFile } from 'node:fs/promises'

const database = new URL(process.env.DATABASE_URL || 'invalid:')
if (process.env.WORKSPACE_E2E !== '1' || !['localhost', '127.0.0.1'].includes(database.hostname) || database.pathname !== '/workspace_e2e') throw new Error('Administrator fixtures require the isolated local workspace_e2e database.')
const db = new PrismaClient()
const owned = []
const password = 'Admin-policy-isolated-test-password!'
const content = 'mixed-port: 7890\nproxies: []\nrules:\n  - MATCH,DIRECT\n'
const origin = 'http://localhost:3000'
const headers = { origin }
async function administrator(page) {
  const state = JSON.parse(await readFile('tests/browser/.auth/state.json', 'utf8'))
  await page.context().addCookies(state.cookies)
}
async function fixture(data = {}, withPassword = false) {
  const user = await db.user.create({ data: { email: `admin-policy-${randomUUID()}@example.test`, name: 'Policy fixture', ...data } })
  owned.push(user.id)
  if (withPassword) await db.account.create({ data: { userId: user.id, providerId: 'credential', accountId: user.id, password: await hashPassword(password) } })
  return user
}
async function legacySession(page, userId) {
  const state = JSON.parse(await readFile('tests/browser/.auth/state.json', 'utf8'))
  const cookie = state.cookies.find(cookie => cookie.name.endsWith('.session_token'))
  expect(cookie).toBeTruthy()
  const [realToken, realSignature] = decodeURIComponent(cookie.value).split('.')
  const sign = token => createHmac('sha256', process.env.BETTER_AUTH_SECRET).update(token).digest('base64')
  expect(sign(realToken)).toBe(realSignature)
  const token = randomBytes(32).toString('hex')
  await db.session.create({ data: { userId, token, expiresAt: new Date(Date.now() + 3600000) } })
  await page.context().addCookies([{ ...cookie, value: encodeURIComponent(`${token}.${sign(token)}`) }])
}
async function login(page, email, chosenPassword = password) {
  const send = () => page.request.post('/api/auth/sign-in/email', { headers, data: { email, password: chosenPassword } })
  const response = await send()
  if (response.status() !== 429) return response
  // Respect the real server's short burst window. Never disable its limiter,
  // change the client IP, or retry authorization failures. Long lockouts fail.
  const retry = Number(response.headers()['x-retry-after'] ?? response.headers()['retry-after'])
  expect(Number.isFinite(retry) && retry >= 0 && retry <= 15).toBe(true)
  await new Promise(resolve => setTimeout(resolve, (retry + 1) * 1000))
  return send()
}
async function get(page, path) {
  const response = await page.request.get(path)
  expect(response.status(), await response.text()).toBe(200)
  return response.json()
}
test.afterAll(async () => {
  const users = await db.user.findMany({ where: { id: { in: owned } }, select: { email: true } })
  await db.securityEvent.deleteMany({ where: { OR: [{ userId: { in: owned } }, { identifier: { in: users.map(user => user.email) } }] } })
  await db.user.deleteMany({ where: { id: { in: owned } } })
  await db.$disconnect()
})

test('ordinary creation has no enrollment, credential or session and subscription works without login', async ({ page, request }) => {
  await administrator(page)
  const admin = await db.user.findUniqueOrThrow({ where: { email: process.env.E2E_ADMIN_EMAIL } })
  const config = await db.config.create({ data: { userId: admin.id, name: `policy-${randomUUID()}`, content } })
  try {
    const response = await page.request.post('/api/users', { data: { email: `admin-policy-${randomUUID()}@example.test`, configIds: [config.id] } })
    expect(response.status()).toBe(200)
    const body = await response.json()
    owned.push(body.user.id)
    expect(body).not.toHaveProperty('activationLink')
    expect(body.user).not.toHaveProperty('activationToken')
    expect(body.user.subscription).not.toHaveProperty('token')
    expect(await db.activationToken.count({ where: { userId: body.user.id } })).toBe(0)
    expect(await db.account.count({ where: { userId: body.user.id } })).toBe(0)
    expect(await db.session.count({ where: { userId: body.user.id } })).toBe(0)
    const before = (await get(page, `/api/users/${body.user.id}/subscription`)).subscription
    const returned = await request.get(`/api/sub/${before.token}`)
    expect(returned.status()).toBe(200)
    expect(await returned.text()).toContain('mixed-port')
    const after = await db.subscription.findUniqueOrThrow({ where: { userId: body.user.id } })
    expect(after.accessCount).toBe(before.accessCount + 1)
    expect(after.token).toBe(before.token)
  } finally { await db.config.delete({ where: { id: config.id } }) }
})

test('valid legacy activation tokens cannot reveal an account or create any credentials', async ({ page }) => {
  const user = await fixture()
  const token = randomBytes(32).toString('hex')
  await db.activationToken.create({ data: { userId: user.id, token, expiresAt: new Date(Date.now() + 86400000) } })
  for (const path of ['/api/activate/verify', `/api/activate/verify?token=${token}`, '/api/activate/verify?token=unknown-test-token']) {
    const response = await page.request.get(path)
    expect(response.status()).toBe(410)
    expect(await response.json()).toEqual({ code: 'ACTIVATION_DISABLED', error: '激活入口已停用，订阅用户无需登录' })
    expect(response.headers()['cache-control']).toContain('no-store')
  }
  for (const role of ['user', 'admin']) {
    await db.user.update({ where: { id: user.id }, data: { role } })
    const response = await page.request.post('/api/activate/setup', { data: { token, authType: 'password', password } })
    expect(response.status()).toBe(410)
    expect(await db.account.count({ where: { userId: user.id } })).toBe(0)
    expect(await db.session.count({ where: { userId: user.id } })).toBe(0)
    expect((await db.activationToken.findUniqueOrThrow({ where: { userId: user.id } })).used).toBe(false)
  }
})

for (const [name, account] of [
  ['subscriber with an old password', { role: 'user' }],
  ['disabled administrator', { role: 'admin', isActive: false }],
  ['banned administrator', { role: 'admin', isBanned: true }],
]) {
  test(`${name} cannot obtain a session with correct credentials`, async ({ page }) => {
    const user = await fixture(account, true)
    const response = await login(page, user.email)
    expect(response.status(), await response.text()).toBe(403)
    expect((await response.json()).code).toBe('ADMIN_ONLY')
    expect(await db.session.count({ where: { userId: user.id } })).toBe(0)
    expect(await get(page, '/api/auth/get-session')).toBeNull()
    expect(await db.securityEvent.count({ where: { identifier: user.email, type: 'auth_sign_in_success' } })).toBe(0)
  })
}

test('enabled administrator can still sign in and access protected management', async ({ page }) => {
  const user = await fixture({ role: 'admin' }, true)
  const response = await login(page, user.email)
  expect(response.status(), await response.text()).toBe(200)
  expect((await get(page, '/api/auth/get-session')).user.id).toBe(user.id)
  expect((await page.request.get('/api/workspace')).status()).toBe(200)
  expect(await db.session.count({ where: { userId: user.id } })).toBe(1)
})

for (const [label, data] of [['subscriber', { role: 'user' }], ['disabled admin', { role: 'admin', isActive: false }], ['banned admin', { role: 'admin', isBanned: true }]]) {
  test(`a signed legacy ${label} session cannot read or mutate authentication`, async ({ page }) => {
    const user = await fixture(data, true)
    await legacySession(page, user.id)
    expect((await page.request.get('/api/workspace')).status()).toBe(403)
    expect(await get(page, '/api/auth/get-session')).toBeNull()
    const account = await db.account.findFirstOrThrow({ where: { userId: user.id } })
    for (const endpoint of ['/api/auth/list-sessions', '/api/auth/list-accounts', '/api/auth/passkey/list-user-passkeys']) expect((await page.request.get(endpoint)).status()).toBe(403)
    for (const [endpoint, body] of [
      ['/api/auth/update-user', { name: 'Should not change' }],
      ['/api/auth/change-password', { currentPassword: password, newPassword: 'Must-not-be-saved-123456' }],
      ['/api/auth/link-social', { provider: 'github', callbackURL: '/settings' }],
      ['/api/auth/passkey/generate-register-options', { name: 'Blocked key' }],
    ]) expect((await page.request.post(endpoint, { headers, data: body })).status()).toBe(403)
    expect((await db.user.findUniqueOrThrow({ where: { id: user.id } })).name).toBe('Policy fixture')
    expect((await db.account.findUniqueOrThrow({ where: { id: account.id } })).password).toBe(account.password)
    expect(await db.account.count({ where: { userId: user.id } })).toBe(1)
    expect((await page.request.post('/api/auth/sign-out', { headers, data: {} })).status()).toBe(200)
    expect(await db.session.count({ where: { userId: user.id } })).toBe(0)
  })
}

test('ordinary passwords and manual OAuth links cannot create a hidden login path', async ({ page }) => {
  await administrator(page)
  const user = await fixture()
  const email = `admin-policy-${randomUUID()}@example.test`
  expect((await page.request.post('/api/users', { data: { email, password } })).status()).toBe(400)
  expect(await db.user.findUnique({ where: { email } })).toBeNull()
  expect((await page.request.put(`/api/users/${user.id}`, { data: { password } })).status()).toBe(400)
  expect((await page.request.post('/api/auth/link/github', { data: { userId: user.id, githubId: 'unverified-test-id' } })).status()).toBe(410)
  expect(await db.account.count({ where: { userId: user.id } })).toBe(0)
  expect(await get(page, `/api/users/${user.id}/auth-methods`)).toEqual({ loginAllowed: false, methods: [] })
})

test('promotion requires a new password and cannot inherit subscriber credentials or an old activation', async ({ page, browser }) => {
  await administrator(page)
  const user = await fixture({}, true)
  await db.account.create({ data: { userId: user.id, providerId: 'github', accountId: randomUUID() } })
  await db.passkey.create({ data: { id: randomUUID(), userId: user.id, publicKey: 'fixture-only', credentialID: randomUUID(), counter: 0, deviceType: 'singleDevice', backedUp: false } })
  const activation = randomBytes(32).toString('hex')
  await db.activationToken.create({ data: { userId: user.id, token: activation, expiresAt: new Date(Date.now() + 86400000) } })
  await db.session.create({ data: { userId: user.id, token: randomUUID(), expiresAt: new Date(Date.now() + 3600000) } })
  const subscription = await db.subscription.create({ data: { userId: user.id, token: randomUUID() } })
  expect((await page.request.put(`/api/users/${user.id}`, { data: { role: 'admin' } })).status()).toBe(400)
  const nextPassword = 'Fresh-administrator-policy-password!'
  expect((await page.request.put(`/api/users/${user.id}`, { data: { role: 'admin', password: nextPassword } })).status()).toBe(200)
  const accounts = await db.account.findMany({ where: { userId: user.id } })
  expect(accounts).toHaveLength(1)
  expect(accounts[0].providerId).toBe('credential')
  expect(await db.passkey.count({ where: { userId: user.id } })).toBe(0)
  expect(await db.session.count({ where: { userId: user.id } })).toBe(0)
  expect((await db.activationToken.findUniqueOrThrow({ where: { userId: user.id } })).used).toBe(true)
  const context = await browser.newContext({ baseURL: origin })
  const signedIn = await context.newPage()
  try {
    expect((await login(signedIn, user.email, nextPassword)).status()).toBe(200)
    expect((await page.request.put(`/api/users/${user.id}`, { data: { role: 'user' } })).status()).toBe(200)
    expect(await db.session.count({ where: { userId: user.id } })).toBe(0)
    expect((await login(signedIn, user.email, nextPassword)).status()).toBe(403)
    expect((await db.subscription.findUniqueOrThrow({ where: { userId: user.id } })).token).toBe(subscription.token)
  } finally { await context.close() }
})

test('creation ordering is stable across pages while expiry remains explicit', async ({ page }) => {
  await administrator(page)
  const prefix = `admin-policy-sort-${randomUUID()}`
  const now = Date.now()
  const accounts = []
  for (const [i, createdOffset, expiryOffset] of [[0, 1000, 3000], [1, 2000, 1000], [2, 2000, 2000]]) accounts.push(await fixture({ email: `${prefix}-${i}@example.test`, createdAt: new Date(now + createdOffset), expiresAt: new Date(now + expiryOffset) }))
  const expected = [...accounts].sort((a, b) => b.createdAt - a.createdAt || b.id.localeCompare(a.id)).map(a => a.id)
  const first = await get(page, `/api/workspace?view=accounts&q=${prefix}&pageSize=2&page=1`)
  const second = await get(page, `/api/workspace?view=accounts&q=${prefix}&pageSize=2&page=2`)
  expect([...first.users, ...second.users].map(a => a.id)).toEqual(expected)
  expect((await get(page, `/api/users?search=${prefix}`)).users.map(a => a.id)).toEqual(expected)
  expect((await get(page, `/api/workspace?view=accounts&q=${prefix}&sort=expires`)).users.map(a => a.id)).toEqual([accounts[1].id, accounts[2].id, accounts[0].id])
  expect((await page.request.get('/api/workspace?view=accounts&sort=invalid')).status()).toBe(400)
})

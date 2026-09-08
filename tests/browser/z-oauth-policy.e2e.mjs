import { test, expect } from '@playwright/test'
import { PrismaClient } from '@prisma/client'
import { betterAuth } from 'better-auth'
import { tsImport } from 'tsx/esm/api'
import { createHmac, randomUUID } from 'node:crypto'
import { readFile } from 'node:fs/promises'

const database = new URL(process.env.DATABASE_URL || 'invalid:')
if (process.env.WORKSPACE_E2E !== '1' || !['localhost', '127.0.0.1'].includes(database.hostname) || database.pathname !== '/workspace_e2e') throw new Error('OAuth policy fixtures require local workspace_e2e.')
const db = new PrismaClient()
const owned = []
const origin = 'http://localhost:3000'
let production
let previousPrisma

test.beforeAll(async () => {
  // Reuse the shipped auth options, session hook and guarded adapter. Only the
  // external provider is configured as a fixture; the app has no test bypass.
  // The source module normally runs inside Next's CommonJS-capable bundle.
  // Reuse the real isolated Prisma connection via its existing lazy cache when
  // importing it as native ESM here; no adapter or database method is mocked.
  previousPrisma = globalThis.prisma
  globalThis.prisma = db
  production = (await tsImport('../../src/lib/auth.ts', import.meta.url)).auth
})
test.afterAll(async () => {
  await db.user.deleteMany({ where: { id: { in: owned } } })
  await db.$disconnect()
  if (previousPrisma === undefined) delete globalThis.prisma
  else globalThis.prisma = previousPrisma
})

async function setup({ bound = false, explicit = false, role = 'admin', legacy = false, additionalData } = {}) {
  const user = await db.user.create({ data: { email: `oauth-policy-${randomUUID()}@example.test`, role, name: 'OAuth fixture' } })
  owned.push(user.id)
  const providerId = randomUUID()
  if (bound) await db.account.create({ data: { userId: user.id, providerId: 'github', accountId: providerId, accessToken: 'fixture-original-token' } })
  const instance = betterAuth({ ...production.options, socialProviders: {
    github: { clientId: 'fixture-client-id', clientSecret: 'fixture-client-secret', disableImplicitSignUp: true },
  } })
  // Legacy state is produced by the real library without the new initiation
  // hook. The callback always goes through the shipped, guarded options.
  const starter = legacy ? betterAuth({ ...instance.options, hooks: undefined,
    account: { ...instance.options.account, accountLinking: { ...instance.options.account.accountLinking, disableImplicitLinking: false } },
  }) : instance
  const jar = new Map()
  const context = await instance.$context
  let session
  if (explicit) {
    session = legacy
      ? await db.session.create({ data: { userId: user.id, token: randomUUID(), expiresAt: new Date(Date.now() + 3600000) } })
      : await context.internalAdapter.createSession(user.id)
    expect(session).toBeTruthy()
    const signature = createHmac('sha256', process.env.BETTER_AUTH_SECRET).update(session.token).digest('base64')
    jar.set(context.authCookies.sessionToken.name, encodeURIComponent(`${session.token}.${signature}`))
  }
  function remember(response) {
    for (const cookie of response.headers.getSetCookie()) {
      const pair = cookie.split(';', 1)[0]
      const index = pair.indexOf('=')
      jar.set(pair.slice(0, index), pair.slice(index + 1))
    }
  }
  const beginRequest = () => starter.handler(new Request(`${origin}/api/auth/${explicit ? 'link-social' : 'sign-in/social'}`, {
    method: 'POST', headers: { origin, 'content-type': 'application/json', cookie: [...jar].map(([key, value]) => `${key}=${value}`).join('; ') },
    body: JSON.stringify({ provider: 'github', callbackURL: `${origin}/${explicit ? 'settings' : 'dashboard'}`, errorCallbackURL: `${origin}/login`, additionalData: typeof additionalData === 'function' ? additionalData(user, session) : additionalData }),
  }))
  let begin = await beginRequest()
  if (begin.status === 429) {
    const seconds = Number(begin.headers.get('x-retry-after') ?? begin.headers.get('retry-after'))
    expect(Number.isFinite(seconds) && seconds >= 0 && seconds <= 15).toBe(true)
    await new Promise(resolve => setTimeout(resolve, (seconds + 1) * 1000))
    begin = await beginRequest()
  }
  expect(begin.status, await begin.clone().text()).toBe(200)
  remember(begin)
  const state = new URL((await begin.json()).url).searchParams.get('state')
  expect(state).toBeTruthy()

  async function callback() {
    // Explicit linking state, not an incoming session cookie, identifies the
    // binding owner. This also exercises a return after the browser lost a session.
    jar.delete(context.authCookies.sessionToken.name)
    const originalFetch = globalThis.fetch
    const called = []
    globalThis.fetch = async input => {
      const url = input instanceof Request ? input.url : String(input)
      called.push(url)
      if (url === 'https://github.com/login/oauth/access_token') return Response.json({ access_token: 'fixture-replacement-token', token_type: 'bearer', scope: 'read:user user:email' })
      if (url === 'https://api.github.com/user') return Response.json({ id: providerId, login: 'policy-fixture', name: 'OAuth fixture', email: user.email, avatar_url: null })
      if (url === 'https://api.github.com/user/emails') return Response.json([{ email: user.email, primary: true, verified: true }])
      throw new Error(`Unexpected outbound OAuth fixture request: ${new URL(url).origin}`)
    }
    try {
      const result = await instance.handler(new Request(`${origin}/api/auth/callback/github?code=fixture-code&state=${encodeURIComponent(state)}`, {
        headers: { cookie: [...jar].map(([key, value]) => `${key}=${value}`).join('; ') },
      }))
      expect(called).toEqual(['https://github.com/login/oauth/access_token', 'https://api.github.com/user', 'https://api.github.com/user/emails'])
      return result
    } finally { globalThis.fetch = originalFetch }
  }
  return { user, callback, sessionId: session?.id }
}
async function expectDenied(response) {
  const failed = response.status === 403 || (response.status === 302 && (response.headers.get('location') || '').includes('error='))
  expect(failed, `Unexpected callback result: ${response.status}`).toBe(true)
}
const denied = [
  ['subscriber', { role: 'user' }],
  ['disabled administrator', { isActive: false }],
  ['banned administrator', { isBanned: true }],
]
for (const [label, state] of denied) {
  test(`OAuth sign-in cannot implicitly link a ${label}`, async () => {
    const flow = await setup()
    await db.user.update({ where: { id: flow.user.id }, data: state })
    await expectDenied(await flow.callback())
    expect(await db.account.count({ where: { userId: flow.user.id } })).toBe(0)
    expect(await db.session.count({ where: { userId: flow.user.id } })).toBe(0)
    expect((await db.user.findUniqueOrThrow({ where: { id: flow.user.id } })).emailVerified).toBe(false)
  })
  test(`OAuth sign-in cannot refresh an existing ${label} binding`, async () => {
    const flow = await setup({ bound: true })
    await db.user.update({ where: { id: flow.user.id }, data: state })
    await expectDenied(await flow.callback())
    const binding = await db.account.findFirstOrThrow({ where: { userId: flow.user.id, providerId: 'github' } })
    expect(binding.accessToken).toBe('fixture-original-token')
    expect(await db.session.count({ where: { userId: flow.user.id } })).toBe(0)
  })
  test(`previously authorized link callbacks recheck a now-${label} before every binding write`, async () => {
    test.setTimeout(90000)
    for (const bound of [false, true]) {
      const flow = await setup({ bound, explicit: true })
      await db.user.update({ where: { id: flow.user.id }, data: state })
      await expectDenied(await flow.callback())
      const bindings = await db.account.findMany({ where: { userId: flow.user.id } })
      expect(bindings).toHaveLength(bound ? 1 : 0)
      if (bound) expect(bindings[0].accessToken).toBe('fixture-original-token')
      expect(await db.session.count({ where: { userId: flow.user.id } })).toBe(1)
    }
  })
}
test('eligible administrators retain bound OAuth sign-in and explicit linking without implicit enrollment', async () => {
  test.setTimeout(90000)
  for (const explicit of [false, true]) for (const bound of [false, true]) {
    const flow = await setup({ explicit, bound })
    const response = await flow.callback()
    if (!explicit && !bound) {
      await expectDenied(response)
      expect(await db.account.count({ where: { userId: flow.user.id } })).toBe(0)
      expect(await db.session.count({ where: { userId: flow.user.id } })).toBe(0)
      continue
    }
    expect(response.status).toBe(302)
    expect(response.headers.get('location')).toBe(`${origin}/${explicit ? 'settings' : 'dashboard'}`)
    const bindings = await db.account.findMany({ where: { userId: flow.user.id } })
    expect(bindings).toHaveLength(1)
    expect(bindings[0].accessToken).toBe('fixture-replacement-token')
    expect(await db.session.count({ where: { userId: flow.user.id } })).toBe(1)
  }
})

async function administrator(page) {
  const state = JSON.parse(await readFile('tests/browser/.auth/state.json', 'utf8'))
  await page.context().addCookies(state.cookies)
}
async function updateAccount(page, userId, data) {
  const response = await page.request.put(`/api/users/${userId}`, { data })
  expect(response.status(), await response.text()).toBe(200)
}
function noNewSessionCookie(response) {
  expect(response.headers.getSetCookie().filter(value => /(?:^|;)\s*(?:__Secure-)?better-auth\.session_token=[^;]/.test(value))).toEqual([])
}
for (const bound of [false, true]) {
  test(`pre-promotion OAuth sign-in cannot create an administrator binding (legacy binding: ${bound})`, async ({ page }) => {
    await administrator(page)
    const flow = await setup({ role: 'user', bound, legacy: true })
    await updateAccount(page, flow.user.id, { role: 'admin', password: 'Fresh-promotion-regression-password!' })
    const before = await db.account.findMany({ where: { userId: flow.user.id } })
    expect(before).toHaveLength(1)
    expect(before[0].providerId).toBe('credential')
    const result = await flow.callback()
    await expectDenied(result)
    expect(new URL(result.headers.get('location')).searchParams.get('error')).toBe('account_not_linked')
    noNewSessionCookie(result)
    expect(await db.account.findMany({ where: { userId: flow.user.id } })).toEqual(before)
    expect(await db.session.count({ where: { userId: flow.user.id } })).toBe(0)
    expect((await db.user.findUniqueOrThrow({ where: { id: flow.user.id } })).emailVerified).toBe(false)
  })
  test(`revoking the initiating session rejects explicit callback writes (existing binding: ${bound})`, async () => {
    const flow = await setup({ bound, explicit: true })
    const before = await db.account.findMany({ where: { userId: flow.user.id } })
    await db.session.delete({ where: { id: flow.sessionId } })
    const result = await flow.callback()
    await expectDenied(result)
    noNewSessionCookie(result)
    expect(await db.account.findMany({ where: { userId: flow.user.id } })).toEqual(before)
    expect(await db.session.count({ where: { userId: flow.user.id } })).toBe(0)
  })
}
test('an explicit callback cannot cross demotion and re-promotion even after a new login', async ({ page }) => {
  await administrator(page)
  const flow = await setup({ explicit: true, bound: true })
  await updateAccount(page, flow.user.id, { role: 'user' })
  await updateAccount(page, flow.user.id, { role: 'admin', password: 'New-epoch-administrator-password!' })
  const context = await production.$context
  const replacement = await context.internalAdapter.createSession(flow.user.id)
  expect(replacement.id).not.toBe(flow.sessionId)
  const before = await db.account.findMany({ where: { userId: flow.user.id } })
  await expectDenied(await flow.callback())
  expect(await db.account.findMany({ where: { userId: flow.user.id } })).toEqual(before)
  expect(await db.session.count({ where: { userId: flow.user.id } })).toBe(1)
})
test('legacy unsigned and forged explicit-link authorization cannot survive promotion', async ({ page }) => {
  test.setTimeout(90000)
  await administrator(page)
  for (const forged of [false, true]) {
    const flow = await setup({ role: 'user', explicit: true, legacy: true,
      additionalData: forged ? (user, session) => ({ adminLinkAuthorization: { userId: user.id, sessionId: session.id, signature: '0'.repeat(64) } }) : undefined,
    })
    await updateAccount(page, flow.user.id, { role: 'admin', password: 'Legacy-state-must-not-survive!' })
    const before = await db.account.findMany({ where: { userId: flow.user.id } })
    await expectDenied(await flow.callback())
    expect(await db.account.findMany({ where: { userId: flow.user.id } })).toEqual(before)
    expect(await db.session.count({ where: { userId: flow.user.id } })).toBe(0)
  }
})
test('the initiation hook replaces client-supplied link authorization with the authenticated session', async () => {
  const flow = await setup({ explicit: true, additionalData: { adminLinkAuthorization: { userId: 'not-the-owner', sessionId: 'forged', signature: '0'.repeat(64) } } })
  const result = await flow.callback()
  expect(result.status).toBe(302)
  expect(result.headers.get('location')).toBe(`${origin}/settings`)
  expect(await db.account.count({ where: { userId: flow.user.id, providerId: 'github' } })).toBe(1)
})
test('an expired initiating session cannot authorize an explicit link', async () => {
  const flow = await setup({ explicit: true })
  await db.session.update({ where: { id: flow.sessionId }, data: { expiresAt: new Date(Date.now() - 1000) } })
  await expectDenied(await flow.callback())
  expect(await db.account.count({ where: { userId: flow.user.id } })).toBe(0)
})
test('explicit callback waits for session revocation and refuses the binding after its commit', async () => {
  const flow = await setup({ explicit: true })
  let release, ready
  const gate = new Promise(resolve => { release = resolve })
  const started = new Promise(resolve => { ready = resolve })
  const revocation = db.$transaction(async tx => {
    const [{ pid }] = await tx.$queryRaw`SELECT pg_backend_pid() AS pid`
    await tx.session.delete({ where: { id: flow.sessionId } })
    ready(pid)
    await gate
  }, { timeout: 15000 })
  const pid = await Promise.race([started, revocation.then(() => { throw new Error('Revocation finished before barrier') })])
  const callback = flow.callback()
  try {
    await expect.poll(async () => {
      const [{ waiting }] = await db.$queryRaw`SELECT count(*)::int AS waiting FROM pg_stat_activity WHERE ${pid} = ANY(pg_blocking_pids(pid)) AND query LIKE '%FROM sessions%'`
      return waiting
    }, { timeout: 5000 }).toBeGreaterThan(0)
  } finally { release() }
  await revocation
  await expectDenied(await callback)
  expect(await db.account.count({ where: { userId: flow.user.id } })).toBe(0)
  expect(await db.session.count({ where: { userId: flow.user.id } })).toBe(0)
})

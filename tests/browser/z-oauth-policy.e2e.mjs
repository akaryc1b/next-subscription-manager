import { test, expect } from '@playwright/test'
import { PrismaClient } from '@prisma/client'
import { betterAuth } from 'better-auth'
import { tsImport } from 'tsx/esm/api'
import { createHmac, randomUUID } from 'node:crypto'

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

async function setup({ bound = false, explicit = false } = {}) {
  const user = await db.user.create({ data: { email: `oauth-policy-${randomUUID()}@example.test`, role: 'admin', name: 'OAuth fixture' } })
  owned.push(user.id)
  const providerId = randomUUID()
  if (bound) await db.account.create({ data: { userId: user.id, providerId: 'github', accountId: providerId, accessToken: 'fixture-original-token' } })
  const instance = betterAuth({ ...production.options, socialProviders: {
    github: { clientId: 'fixture-client-id', clientSecret: 'fixture-client-secret', disableImplicitSignUp: true },
  } })
  const jar = new Map()
  const context = await instance.$context
  if (explicit) {
    const session = await context.internalAdapter.createSession(user.id)
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
  const beginRequest = () => instance.handler(new Request(`${origin}/api/auth/${explicit ? 'link-social' : 'sign-in/social'}`, {
    method: 'POST', headers: { origin, 'content-type': 'application/json', cookie: [...jar].map(([key, value]) => `${key}=${value}`).join('; ') },
    body: JSON.stringify({ provider: 'github', callbackURL: `${origin}/${explicit ? 'settings' : 'dashboard'}`, errorCallbackURL: `${origin}/login` }),
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
  return { user, callback }
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
test('eligible administrators retain real OAuth sign-in and explicit linking paths', async () => {
  test.setTimeout(90000)
  for (const explicit of [false, true]) for (const bound of [false, true]) {
    const flow = await setup({ explicit, bound })
    const response = await flow.callback()
    expect(response.status).toBe(302)
    expect(response.headers.get('location')).toBe(`${origin}/${explicit ? 'settings' : 'dashboard'}`)
    const bindings = await db.account.findMany({ where: { userId: flow.user.id } })
    expect(bindings).toHaveLength(1)
    expect(bindings[0].accessToken).toBe('fixture-replacement-token')
    expect(await db.session.count({ where: { userId: flow.user.id } })).toBe(1)
  }
})

import { test, expect } from '@playwright/test'
import { PrismaClient } from '@prisma/client'
import { randomUUID } from 'node:crypto'
import { readFile } from 'node:fs/promises'

// Only the disposable local acceptance database may receive these fixtures.
const database = new URL(process.env.DATABASE_URL || 'invalid:')
if (process.env.WORKSPACE_E2E !== '1' || !['localhost', '127.0.0.1'].includes(database.hostname) || database.pathname !== '/workspace_e2e') {
  throw new Error('Merge regression fixtures require the isolated local workspace_e2e database.')
}
const db = new PrismaClient()
const day = 86400000
const marker = () => `merge-${randomUUID()}`
const content = 'mixed-port: 7890\nproxies: []\nrules:\n  - MATCH,DIRECT\n'

test.afterAll(async () => { await db.$disconnect() })

async function signIn(page) {
  // Reuse the real authenticated session created by the existing acceptance suite.
  const state = JSON.parse(await readFile('tests/browser/.auth/state.json', 'utf8'))
  await page.context().addCookies(state.cookies)
}
async function getJson(page, url) {
  const response = await page.request.get(url)
  expect(response.status(), await response.text()).toBe(200)
  return response.json()
}
async function loaded(page, path) {
  await page.goto(path)
  await expect(page.locator('.o-page')).toBeVisible()
  await expect(page.locator('.o-loading')).toHaveCount(0)
  await expect(page.locator('.o-problem')).toHaveCount(0)
}
async function adminId() {
  return (await db.user.findUniqueOrThrow({ where: { email: process.env.E2E_ADMIN_EMAIL }, select: { id: true } })).id
}
async function event(data) {
  return db.securityEvent.create({ data: {
    type: 'auth_failure', severity: 'warning', method: 'POST',
    path: '/api/auth/sign-in/email', ipAddress: '192.0.2.88', statusCode: 401,
    message: 'Merge acceptance authentication event', ...data,
  } })
}

for (const target of [
  { query: 'li.ready', label: 'li.ready@example.test', route: /\/users\?account=/ },
  { query: '远程办公', label: '远程办公 · 备用配置', route: /\/configs\?config=/ },
]) {
  test(`command results: ${target.query} cannot activate a previous query during debounce or loading`, async ({ page }) => {
    // Install before the app creates timers so cleanup cancels the same clock.
    await page.clock.install()
    await signIn(page)
    await loaded(page, '/dashboard')
    await page.keyboard.press('Control+k')
    await expect(page.getByRole('option', { name: /lin.design@example.test/ })).toBeVisible()
    await expect(page.getByRole('option', { name: /日常使用/ })).toBeVisible()
    let release
    const gate = new Promise(resolve => { release = resolve })
    let requests = 0
    await page.route('**/api/workspace?*', async route => {
      if (new URL(route.request().url()).searchParams.get('q') === target.query) {
        requests++
        await gate
      }
      await route.continue()
    })
    await page.clock.pauseAt(new Date(Date.now() + 1000))
    try {
      const input = page.getByRole('combobox', { name: '搜索页面、账户或配置' })
      await input.fill(target.query)
      await input.press('Enter')
      await expect(page).toHaveURL(/\/dashboard$/)
      await expect(page.getByRole('option')).toHaveCount(0)
      await page.clock.runFor(300)
      await expect.poll(() => requests).toBe(2)
      await input.press('Enter')
      await expect(page).toHaveURL(/\/dashboard$/)
      await expect(page.getByRole('option')).toHaveCount(0)
      release()
      await page.clock.resume()
      await expect(page.getByRole('option').filter({ hasText: target.label })).toBeVisible()
      await input.press('Enter')
      await expect(page).toHaveURL(target.route)
      await expect(page.getByRole('dialog').getByRole('heading', { name: target.label, exact: true })).toBeVisible()
    } finally {
      release()
      await page.clock.resume()
    }
  })
}

for (const viewport of [
  { name: 'desktop', width: 1440, height: 1000, field: 'name' },
  { name: 'mobile', width: 390, height: 844, field: 'password' },
]) {
  test(`${viewport.name}: dirty ${viewport.field} blocks logout before any session mutation`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height })
    await signIn(page)
    await loaded(page, '/settings')
    let logoutRequests = 0
    // Explicit failure fixture after the guard is released; never revoke the
    // shared acceptance session used by the other independent test cases.
    await page.route('**/api/auth/sign-out', route => {
      logoutRequests++
      return route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ message: 'Injected sign-out failure' }) })
    })
    if (viewport.field === 'name') {
      await page.getByLabel('显示名称', { exact: true }).fill('尚未保存的退出回归')
    } else {
      await page.getByRole('button', { name: '修改密码', exact: true }).click()
      await page.getByLabel('新密码', { exact: true }).fill('Unsaved-password-test')
      await page.getByRole('button', { name: '打开导航', exact: true }).click()
    }
    await page.getByRole('button', { name: '退出登录', exact: true }).click()
    await expect(page.getByText('还有未保存的修改。请先保存，或撤销修改后再离开。', { exact: true })).toBeVisible()
    expect(logoutRequests).toBe(0)
    await expect(page).toHaveURL(/\/settings$/)
    expect((await page.request.get('/api/workspace')).status()).toBe(200)
    if (viewport.field === 'name') {
      await expect(page.getByLabel('显示名称', { exact: true })).toHaveValue('尚未保存的退出回归')
      await page.getByRole('button', { name: '撤销修改', exact: true }).click()
    } else {
      await page.getByRole('button', { name: '关闭导航', exact: true }).click()
      await expect(page.getByLabel('新密码', { exact: true })).toHaveValue('Unsaved-password-test')
      await page.getByRole('button', { name: '取消修改', exact: true }).click()
      await page.getByRole('button', { name: '打开导航', exact: true }).click()
    }
    await page.getByRole('button', { name: '退出登录', exact: true }).click()
    await expect(page.getByText('退出没有完成，请重试。', { exact: true })).toBeVisible()
    expect(logoutRequests).toBe(1)
  })
}

test('enabled users without subscriptions contribute to both attention filtering and totals', async ({ page }) => {
  await signIn(page)
  const before = await getJson(page, '/api/workspace')
  const config = await db.config.findFirstOrThrow({ where: { isActive: true }, select: { id: true } })
  const prefix = marker()
  const ids = []
  try {
    for (const isActive of [true, false]) {
      const user = await db.user.create({ data: {
        email: `${prefix}-${isActive}@example.test`, isActive, isBanned: false, role: 'user',
        userConfigs: { create: { configId: config.id } },
      } })
      ids.push(user.id)
    }
    const result = await getJson(page, `/api/workspace?view=accounts&filter=attention&q=${prefix}`)
    expect(result.users.map(user => user.id)).toEqual([ids[0]])
    expect(result.users[0].subscription).toBeNull()
    expect(result.users[0].userConfigs[0].config.isActive).toBe(true)
    const overview = await getJson(page, '/api/workspace')
    expect(overview.counts.attention).toBe(before.counts.attention + 1)
    await loaded(page, '/users?filter=attention')
    await page.getByLabel('搜索账户邮箱').fill(prefix)
    await expect(page.locator('.o-table tbody tr')).toHaveCount(1)
    await expect(page.locator('.o-table')).toContainText('无订阅')
  } finally {
    await db.user.deleteMany({ where: { id: { in: ids } } })
  }
})

test('authentication identifiers remain searchable and visible without inventing a verified owner', async ({ page }) => {
  await signIn(page)
  const identifier = `${marker()}@example.test`
  const ids = []
  try {
    for (const type of ['auth_failure', 'auth_sign_in_success']) {
      const row = await event({ type, identifier, userId: null, statusCode: type === 'auth_failure' ? 401 : 200 })
      ids.push(row.id)
    }
    const result = await getJson(page, `/api/workspace?view=activity&kind=security&q=${encodeURIComponent(identifier.toUpperCase())}`)
    expect(result.items.map(item => item.id).sort()).toEqual(ids.map(id => `security-${id}`).sort())
    for (const item of result.items) {
      expect(item.detail).toContain(identifier)
      expect(item.userId).toBeNull()
      expect(item).not.toHaveProperty('metadata')
    }
    await loaded(page, '/monitor?kind=security')
    await page.getByLabel('搜索事件').fill(identifier)
    await expect(page.locator('.o-event')).toHaveCount(2)
    await expect(page.locator('.o-event').first()).toContainText(identifier)
    await page.locator('.o-event').first().click()
    await expect(page.getByRole('dialog')).toContainText(identifier)
    await expect(page.getByRole('dialog').getByRole('link', { name: '查看关联账户' })).toHaveCount(0)
  } finally {
    await db.securityEvent.deleteMany({ where: { id: { in: ids } } })
  }
})

for (const entity of ['accounts', 'configs']) {
  test(`${entity}: deleting the last item of page two returns a valid populated page`, async ({ page }) => {
    await signIn(page)
    const prefix = marker()
    const ids = Array.from({ length: 21 }, () => randomUUID())
    const accounts = entity === 'accounts'
    const delegate = accounts ? db.user : db.config
    try {
      if (accounts) {
        await db.user.createMany({ data: ids.map((id, index) => ({ id, email: `${prefix}-${index}@example.test`, isActive: false })) })
      } else {
        const userId = await adminId()
        await db.config.createMany({ data: ids.map((id, index) => ({ id, userId, name: `${prefix}-${index}`, content })) })
      }
      await loaded(page, accounts ? '/users' : '/configs')
      await page.getByLabel(accounts ? '搜索账户邮箱' : '搜索配置名称').fill(prefix)
      await expect(page.locator('.o-page > .o-pager')).toContainText('共 21 项')
      await page.getByRole('button', { name: '下一页', exact: true }).click()
      await expect(page.locator('.o-page > .o-pager')).toContainText('第 2 / 2 页')
      await expect(page.locator('.o-table tbody tr')).toHaveCount(1)
      await page.locator('.o-table .o-text-link').click()
      await page.getByRole('dialog').getByRole('button', { name: accounts ? '删除账户' : '删除配置', exact: true }).click()
      await page.getByRole('button', { name: '永久删除', exact: true }).click()
      await expect(page.getByRole('dialog')).toHaveCount(0)
      await expect(page.locator('.o-page > .o-pager')).toContainText('第 1 / 1 页')
      await expect(page.locator('.o-table tbody tr')).toHaveCount(20)
      expect(await delegate.count({ where: { id: { in: ids } } })).toBe(20)
      const result = await getJson(page, `/api/workspace?view=${entity}&page=2&q=${prefix}`)
      expect(result.pagination).toMatchObject({ page: 1, pageCount: 1, total: 20 })
      expect(result[accounts ? 'users' : 'configs']).toHaveLength(20)
    } finally {
      await delegate.deleteMany({ where: { id: { in: ids } } })
    }
    const empty = await getJson(page, `/api/workspace?view=${entity}&page=2&q=${prefix}`)
    expect(empty.pagination).toMatchObject({ page: 1, pageCount: 0, total: 0 })
    expect(empty[accounts ? 'users' : 'configs']).toEqual([])
  })
}

test('refreshing a fixed activity day retrieves newly arrived records for the same interval', async ({ page }) => {
  await signIn(page)
  const prefix = marker()
  const owner = await db.user.create({ data: { email: `${prefix}@example.test`, isActive: false } })
  const start = new Date(Date.now() - day)
  start.setUTCHours(0, 0, 0, 0)
  const from = start.toISOString()
  const to = new Date(start.getTime() + day - 1).toISOString()
  const requests = []
  const ids = []
  page.on('request', request => {
    const url = new URL(request.url())
    if (url.pathname === '/api/workspace' && url.searchParams.get('view') === 'activity') requests.push(url)
  })
  try {
    await loaded(page, `/monitor?${new URLSearchParams({ kind: 'security', from, to, userId: owner.id })}`)
    await expect(page.locator('.o-event')).toHaveCount(0)
    const row = await event({ userId: owner.id, identifier: prefix, createdAt: new Date(start.getTime() + 12 * 3600000) })
    ids.push(row.id)
    const count = requests.length
    await page.getByRole('button', { name: '刷新数据', exact: true }).click()
    await expect(page.locator('.o-event')).toContainText(prefix)
    expect(requests.length).toBe(count + 1)
    expect(requests.at(-1).searchParams.get('from')).toBe(from)
    expect(requests.at(-1).searchParams.get('to')).toBe(to)
  } finally {
    await db.securityEvent.deleteMany({ where: { id: { in: ids } } })
    await db.user.delete({ where: { id: owner.id } })
  }
})

for (const configs of [0, 1]) {
  test(`onboarding with ${configs} usable configurations points to the actual next step (UI fixture)`, async ({ page }) => {
    await signIn(page)
    // Explicit rendering fixtures; do not delete existing acceptance accounts.
    await page.route('**/api/workspace', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
      asOf: new Date().toISOString(),
      counts: { accounts: 0, configs, attention: 0, expiring: 0, deliveries: 0, security: 0 },
      attention: [], activity: [],
      trend: Array.from({ length: 7 }, (_, index) => ({ date: new Date(Date.now() - (6 - index) * day).toISOString().slice(0, 10), count: 0 })),
    }) }))
    await loaded(page, '/dashboard')
    const action = page.locator('.o-hero .o-button[data-variant="primary"]')
    await expect(action).toHaveText(configs ? '创建第一个账户' : '准备可用配置')
    await expect(action).toHaveAttribute('href', configs ? '/users?new=1' : '/configs?new=1')
    await action.click()
    await expect(page.getByRole('dialog').getByRole('heading', { name: configs ? '创建订阅账户' : '创建一份配置', exact: true })).toBeVisible()
  })
}

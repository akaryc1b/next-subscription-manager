import { test, expect } from '@playwright/test'
import { readFile, mkdir } from 'node:fs/promises'

async function signIn(page) {
  const database = new URL(process.env.DATABASE_URL || 'invalid:')
  if (process.env.WORKSPACE_E2E !== '1' || !['localhost', '127.0.0.1'].includes(database.hostname) || database.pathname !== '/workspace_e2e') throw new Error('Account flow fixtures require local workspace_e2e.')
  const state = JSON.parse(await readFile('tests/browser/.auth/state.json', 'utf8'))
  await page.context().addCookies(state.cookies)
  await page.setViewportSize({ width: 390, height: 844 })
}
async function fixture(page, name) {
  const configs = (await (await page.request.get('/api/workspace?view=configs')).json()).configs
  const response = await page.request.post('/api/users', { data: { email: `mobile-${name}-${Date.now()}@example.test`, role: 'user', configIds: configs.filter(item => item.isActive).slice(0, 1).map(item => item.id) } })
  expect(response.status(), await response.text()).toBe(200)
  return (await response.json()).user
}
async function openAccount(page, id) {
  await page.goto(`/users?account=${id}`)
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByLabel('账户邮箱', { exact: true })).toBeVisible()
  return dialog
}
async function metadata(page, id) {
  const response = await page.request.get(`/api/users/${id}/subscription`)
  expect(response.status()).toBe(200)
  return (await response.json()).subscription
}
const save = dialog => dialog.getByRole('button', { name: '保存修改', exact: true })
const quota = dialog => dialog.getByLabel('允许的总访问次数')
const expiry = dialog => dialog.getByLabel('到期日期（本地时间）', { exact: true })
const copy = dialog => dialog.getByRole('button', { name: '复制订阅链接', exact: true })

test('mobile global search -> one save -> native copy retains the selected user and search', async ({ page, browserName }) => {
  await signIn(page)
  const user = await fixture(page, browserName)
  try {
    const before = await metadata(page, user.id)
    const writes = [], deliveries = []
    page.on('request', request => {
      if (['PUT', 'PATCH'].includes(request.method())) writes.push(request)
      if (new URL(request.url()).pathname.startsWith('/api/sub/')) deliveries.push(request.url())
    })
    await page.goto('/dashboard')
    await page.keyboard.press('Control+k')
    const search = page.getByRole('combobox', { name: '搜索页面、账户或配置' })
    await search.fill(user.email)
    await page.getByRole('option').filter({ hasText: user.email }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog.getByLabel('账户邮箱', { exact: true })).toHaveValue(user.email)
    const selectedURL = page.url()
    await expiry(dialog).fill('2036-01-31')
    await quota(dialog).fill('31')
    await expect(copy(dialog)).toBeDisabled()
    await save(dialog).click()
    await expect(copy(dialog)).toBeEnabled()
    await expect(dialog).toBeVisible()
    expect(page.url()).toBe(selectedURL)
    expect(writes.filter(item => item.method() === 'PUT')).toHaveLength(1)
    expect(writes.filter(item => item.method() === 'PATCH')).toHaveLength(1)
    expect(writes.find(item => item.method() === 'PUT').postDataJSON()).toEqual({ expiresAt: '2036-01-31T15:59:59.000Z' })
    const afterSave = await metadata(page, user.id)
    expect(afterSave.maxAccess).toBe(31)
    expect(afterSave.accessCount).toBe(before.accessCount)
    if (browserName === 'chromium') await page.context().grantPermissions(['clipboard-read', 'clipboard-write'], { origin: new URL(page.url()).origin })
    const box = await copy(dialog).boundingBox()
    expect(box.y + box.height).toBeLessThanOrEqual(845)
    await copy(dialog).click()
    await expect(page.getByText('已复制订阅链接，请仅交给授权用户', { exact: true })).toBeVisible()
    if (browserName === 'chromium') expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(`${new URL(page.url()).origin}/api/sub/${before.token}`)
    expect((await metadata(page, user.id)).accessCount).toBe(before.accessCount)
    expect(deliveries).toEqual([])
    await mkdir('tests/browser/evidence', { recursive: true })
    await page.screenshot({ path: `tests/browser/evidence/${browserName}-mobile-save-copy.png` })
    await dialog.getByRole('button', { name: '关闭', exact: true }).click()
    await expect(dialog).toHaveCount(0)
    await expect(page.getByLabel('搜索账户邮箱')).toHaveValue(user.email)
    expect(new URL(page.url()).searchParams.get('q')).toBe(user.email)
  } finally { expect((await page.request.delete(`/api/users/${user.id}`)).status()).toBe(200) }
})

test('partial save retains the renamed account and retries only the failed quota', async ({ page, browserName }) => {
  await signIn(page)
  const user = await fixture(page, `partial-${browserName}`)
  try {
    let puts = 0, patches = 0
    page.on('request', request => { if (request.method() === 'PUT') puts++ })
    await page.route(`**/api/users/${user.id}/subscription`, route => {
      if (route.request().method() === 'PATCH' && ++patches === 1) return route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: '验收：额度暂时不可用' }) })
      return route.continue()
    })
    const dialog = await openAccount(page, user.id)
    const renamed = `renamed-${user.email}`
    await dialog.getByLabel('账户邮箱', { exact: true }).fill(renamed)
    await quota(dialog).fill('47')
    await save(dialog).click()
    await expect(dialog.getByRole('alert')).toContainText('账户信息已保存，但额度未保存')
    await expect(dialog.getByLabel('账户邮箱', { exact: true })).toHaveValue(renamed)
    await expect(quota(dialog)).toHaveValue('47')
    await expect(copy(dialog)).toBeDisabled()
    await expect(dialog.locator('.o-saved')).toHaveCount(0)
    await dialog.getByRole('button', { name: '关闭', exact: true }).click()
    await expect(page.getByRole('heading', { name: '放弃未保存的修改？' })).toBeVisible()
    await page.getByRole('button', { name: '取消', exact: true }).click()
    await save(dialog).click()
    await expect(copy(dialog)).toBeEnabled()
    expect(puts).toBe(1)
    expect(patches).toBe(2)
    expect((await metadata(page, user.id)).maxAccess).toBe(47)
    const actual = (await (await page.request.get(`/api/workspace?view=accounts&id=${user.id}`)).json()).users[0]
    expect(actual.email).toBe(renamed)
    await expect(dialog.getByRole('heading', { name: renamed, exact: true })).toBeVisible()
  } finally { await page.request.delete(`/api/users/${user.id}`) }
})

test('creation with a custom quota survives partial failure without a second POST', async ({ page, browserName }) => {
  await signIn(page)
  let createdId, posts = 0, patches = 0
  page.on('request', request => { if (new URL(request.url()).pathname === '/api/users' && request.method() === 'POST') posts++ })
  await page.route('**/api/users/*/subscription', route => {
    if (route.request().method() === 'PATCH' && ++patches === 1) return route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: '验收：首次额度保存失败' }) })
    return route.continue()
  })
  try {
    await page.goto('/users?new=1')
    const dialog = page.getByRole('dialog')
    await dialog.getByLabel('账户邮箱', { exact: true }).fill(`mobile-create-${browserName}-${Date.now()}@example.test`)
    await quota(dialog).fill('63')
    const responsePromise = page.waitForResponse(response => new URL(response.url()).pathname === '/api/users' && response.request().method() === 'POST')
    await dialog.getByRole('button', { name: '创建账户', exact: true }).click()
    const response = await responsePromise
    expect(response.status()).toBe(200)
    createdId = (await response.json()).user.id
    await expect(dialog.getByRole('alert')).toContainText('账户已创建，重试不会重复创建')
    await expect(dialog.locator('.o-saved')).toHaveCount(0)
    await expect(quota(dialog)).toHaveValue('63')
    await save(dialog).click()
    await expect(dialog.getByRole('heading', { name: '账户已准备好', exact: true })).toBeVisible()
    expect(posts).toBe(1)
    expect(patches).toBe(2)
    expect((await metadata(page, createdId)).maxAccess).toBe(63)
    await expect(copy(dialog)).toBeEnabled()
    await dialog.getByRole('button', { name: '继续编辑', exact: true }).click()
    await expect(quota(dialog)).toHaveValue('63')
    await expect(save(dialog)).toBeDisabled()
  } finally { if (createdId) await page.request.delete(`/api/users/${createdId}`) }
})

test('invalid quota prevents all writes and a failed user save never patches quota', async ({ page, browserName }) => {
  await signIn(page)
  const user = await fixture(page, `invalid-${browserName}`)
  try {
    const writes = []
    page.on('request', request => { if (['PUT', 'PATCH'].includes(request.method())) writes.push(request.method()) })
    const dialog = await openAccount(page, user.id)
    await expiry(dialog).fill('2036-06-30')
    await quota(dialog).fill('-1')
    await save(dialog).click()
    expect(await quota(dialog).evaluate(element => element.validity.rangeUnderflow)).toBe(true)
    expect(writes).toEqual([])
    await quota(dialog).fill('80')
    await page.route(`**/api/users/${user.id}`, route => route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: '验收：账户保存失败' }) }))
    await save(dialog).click()
    await expect(dialog.getByRole('alert')).toContainText('验收：账户保存失败')
    expect(writes).toEqual(['PUT'])
    await expect(expiry(dialog)).toHaveValue('2036-06-30')
    await expect(quota(dialog)).toHaveValue('80')
    await expect(copy(dialog)).toBeDisabled()
  } finally { await page.request.delete(`/api/users/${user.id}`) }
})

test('mobile date shortcuts, optional time and narrow layouts remain usable', async ({ page, browserName }) => {
  await signIn(page)
  await page.goto('/users?new=1')
  const dialog = page.getByRole('dialog')
  const year = new Date().getFullYear() + 2
  await expiry(dialog).fill(`${year}-01-31`)
  await dialog.getByRole('button', { name: '调整时间', exact: true }).click()
  await dialog.getByLabel('到期时间（本地时间）', { exact: true }).fill('12:34:56')
  await dialog.getByRole('button', { name: '+1 个月', exact: true }).click()
  await expect(expiry(dialog)).toHaveValue(`${year}-02-${new Date(year, 2, 0).getDate()}`)
  await expect(dialog.getByLabel('到期时间（本地时间）', { exact: true })).toHaveValue('12:34:56')
  await dialog.getByRole('button', { name: '长期有效', exact: true }).click()
  await expect(expiry(dialog)).toHaveValue('')
  await expect(dialog.getByRole('button', { name: '调整时间', exact: true })).toBeDisabled()
  await dialog.getByRole('button', { name: '+3 个月', exact: true }).click()
  await expect(expiry(dialog)).not.toHaveValue('')
  for (const width of [320, 390, 430]) {
    await page.setViewportSize({ width, height: 844 })
    expect(await dialog.evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true)
    const dateBox = await expiry(dialog).boundingBox()
    expect(dateBox.height).toBeGreaterThanOrEqual(44)
    expect(dateBox.x + dateBox.width).toBeLessThanOrEqual(width + 1)
    for (const button of await dialog.getByRole('group', { name: '快捷续期' }).getByRole('button').all()) expect((await button.boundingBox()).height).toBeGreaterThanOrEqual(44)
  }
  await mkdir('tests/browser/evidence', { recursive: true })
  await dialog.locator('.o-drawer-body').evaluate(element => element.scrollTo(0, 0))
  await page.screenshot({ path: `tests/browser/evidence/${browserName}-mobile-expiry-form.png` })
})

test('pending saves reject duplicate submission and block copying until both writes finish', async ({ page, browserName }) => {
  await signIn(page)
  const user = await fixture(page, `pending-${browserName}`)
  let release
  const gate = new Promise(resolve => { release = resolve })
  let puts = 0, patches = 0
  try {
    const dialog = await openAccount(page, user.id)
    await expiry(dialog).fill('2036-07-31')
    await quota(dialog).fill('99')
    await page.route(`**/api/users/${user.id}`, async route => { puts++; await gate; await route.continue() })
    page.on('request', request => { if (request.method() === 'PATCH') patches++ })
    await save(dialog).click()
    await expect.poll(() => puts).toBe(1)
    await dialog.getByRole('form', { name: '账户与授权' }).evaluate(form => { form.requestSubmit(); form.requestSubmit() })
    await expect(copy(dialog)).toBeDisabled()
    await expect(dialog.getByRole('button', { name: '关闭', exact: true })).toBeDisabled()
    expect(puts).toBe(1)
    expect(patches).toBe(0)
    release()
    await expect(copy(dialog)).toBeEnabled()
    expect(puts).toBe(1)
    expect(patches).toBe(1)
  } finally { release(); await page.request.delete(`/api/users/${user.id}`) }
})

test('global search replaces the query when the accounts page is already mounted', async ({ page, browserName }) => {
  await signIn(page)
  const user = await fixture(page, `search-${browserName}`)
  try {
    await page.goto('/users?q=does-not-match')
    await expect(page.getByLabel('搜索账户邮箱')).toHaveValue('does-not-match')
    await page.keyboard.press('Control+k')
    await page.getByRole('combobox', { name: '搜索页面、账户或配置' }).fill(user.email)
    await page.getByRole('option').filter({ hasText: user.email }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog.getByLabel('账户邮箱', { exact: true })).toHaveValue(user.email)
    await dialog.getByRole('button', { name: '关闭', exact: true }).click()
    await expect(page.getByLabel('搜索账户邮箱')).toHaveValue(user.email)
    await expect(page.getByRole('button', { name: `管理 ${user.email}`, exact: true })).toBeVisible()
  } finally { await page.request.delete(`/api/users/${user.id}`) }
})

import { test, expect } from '@playwright/test'
import { readFile, mkdir } from 'node:fs/promises'

async function signIn(page) {
  const state = JSON.parse(await readFile('tests/browser/.auth/state.json', 'utf8'))
  await page.context().addCookies(state.cookies)
}
async function loaded(page, path) {
  await page.goto(path)
  await expect(page.locator('.o-page')).toBeVisible()
  await expect(page.locator('.o-loading')).toHaveCount(0)
  await expect(page.locator('.o-problem')).toHaveCount(0)
}
async function noOverflow(page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true)
  expect(await page.locator('.o-main').evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true)
}

test('mobile first fold shows tasks instead of a promotional hero', async ({ page, browserName }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await signIn(page)
  const speculative = []
  page.on('request', request => { if (request.headers()['next-router-prefetch']) speculative.push(request.url()) })
  await loaded(page, '/dashboard')
  await expect(page.locator('.o-hero, .o-art, .o-eyebrow')).toHaveCount(0)
  expect(await page.locator('h1').evaluate(el => parseFloat(getComputedStyle(el).fontSize))).toBeLessThanOrEqual(22)
  expect((await page.locator('.o-queue-row').first().boundingBox()).y).toBeLessThan(450)
  expect(await page.evaluate(() => document.getAnimations().filter(animation => animation.effect?.getTiming().iterations === Infinity).length)).toBe(0)
  await noOverflow(page)
  await mkdir('tests/browser/evidence', { recursive: true })
  await page.screenshot({ path: `tests/browser/evidence/${browserName}-compact-dashboard.png` })
  expect(speculative).toEqual([])
  await page.locator('.o-queue-row a').first().click()
  await expect(page.getByRole('dialog')).toBeVisible()
  const blur = await page.locator('.o-overlay').evaluate(el => getComputedStyle(el).backdropFilter || getComputedStyle(el).webkitBackdropFilter || 'none')
  expect(blur).toBe('none')
})

test('mobile list copies Shadowrocket directly, preserving gesture while metadata is pending', async ({ page, browserName }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await signIn(page)
  await page.addInitScript(() => {
    // Controlled clipboard adapter: tests the WebKit gesture ordering, not native OS paste.
    window.__copy = { called: false, gesture: false, text: '' }
    window.ClipboardItem = class { constructor(types) { this.types = types } }
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: {
      write: async ([item]) => {
        window.__copy.called = true
        window.__copy.gesture = navigator.userActivation.isActive
        window.__copy.text = await (await item.types['text/plain']).text()
      },
    } })
  })
  const account = (await (await page.request.get('/api/workspace?view=accounts&q=lin.design')).json()).users[0]
  const before = (await (await page.request.get(`/api/users/${account.id}/subscription`)).json()).subscription
  const contentRequests = []
  page.on('request', request => { if (new URL(request.url()).pathname.startsWith('/api/sub/')) contentRequests.push(request.url()) })
  await loaded(page, '/users')
  const button = page.getByRole('button', { name: '复制 lin.design@example.test 的 Shadowrocket 链接', exact: true })
  await button.scrollIntoViewIfNeeded()
  const box = await button.boundingBox()
  expect(box.height).toBeGreaterThanOrEqual(44)
  expect(box.width).toBeGreaterThanOrEqual(44)
  let release
  const gate = new Promise(resolve => { release = resolve })
  let metadataReads = 0
  await page.route(`**/api/users/${account.id}/subscription`, async route => { metadataReads++; await gate; await route.continue() })
  try {
    await button.click()
    await expect.poll(() => page.evaluate(() => window.__copy.called)).toBe(true)
    expect(await page.evaluate(() => window.__copy.gesture)).toBe(true)
    await expect(button).toBeDisabled()
    expect(await page.evaluate(() => window.__copy.text)).toBe('')
  } finally { release() }
  await expect(page.getByText('已复制 Shadowrocket 链接', { exact: true })).toBeVisible()
  const text = await page.evaluate(() => window.__copy.text)
  expect(text.startsWith('sub://')).toBe(true)
  expect(Buffer.from(text.slice(6), 'base64').toString('utf8')).toBe(`${new URL(page.url()).origin}/api/sub/${before.token}`)
  expect(metadataReads).toBe(1)
  expect(contentRequests).toEqual([])
  await expect(page.getByRole('dialog')).toHaveCount(0)
  const after = (await (await page.request.get(`/api/users/${account.id}/subscription`)).json()).subscription
  expect(after.accessCount).toBe(before.accessCount)
  expect(await page.evaluate(() => JSON.stringify(localStorage))).not.toContain(before.token)
  await expect(button).toBeEnabled()
  await noOverflow(page)
  await page.screenshot({ path: `tests/browser/evidence/${browserName}-compact-users.png` })
})

test('desktop direct Shadowrocket button retains the text clipboard fallback', async ({ page }) => {
  await signIn(page)
  await page.addInitScript(() => {
    window.ClipboardItem = undefined
    window.__text = ''
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async text => { window.__text = text } } })
  })
  await loaded(page, '/users')
  await page.getByRole('button', { name: '复制 lin.design@example.test 的 Shadowrocket 链接', exact: true }).click()
  await expect.poll(() => page.evaluate(() => window.__text.startsWith('sub://'))).toBe(true)
  await expect(page.getByRole('dialog')).toHaveCount(0)
})

test('failed Shadowrocket metadata is not reported as a copied link', async ({ page }) => {
  await signIn(page)
  await page.addInitScript(() => {
    window.ClipboardItem = undefined
    window.__text = ''
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async text => { window.__text = text } } })
  })
  await loaded(page, '/users')
  await page.route('**/api/users/*/subscription', route => route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: '验收：链接读取失败' }) }))
  const button = page.getByRole('button', { name: '复制 lin.design@example.test 的 Shadowrocket 链接', exact: true })
  await button.click()
  await expect(page.getByText('验收：链接读取失败')).toBeVisible()
  await expect(page.getByText('已复制 Shadowrocket 链接', { exact: true })).toHaveCount(0)
  expect(await page.evaluate(() => window.__text)).toBe('')
  await expect(button).toBeEnabled()
})

test('small screens retain compact headings, usable inputs and no horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 })
  await signIn(page)
  for (const [path, title] of [['/users', '订阅账户'], ['/configs', '配置库'], ['/monitor', '访问动态'], ['/calendar', '到期日程'], ['/settings', '账户设置']]) {
    await loaded(page, path)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(title)
    expect(await page.locator('h1').evaluate(el => parseFloat(getComputedStyle(el).fontSize))).toBeLessThanOrEqual(22)
    await noOverflow(page)
  }
  await page.getByRole('button', { name: '打开导航', exact: true }).click()
  await expect(page.getByRole('dialog', { name: '工作空间导航' })).toBeVisible()
  await page.getByRole('dialog').getByRole('link', { name: '订阅账户', exact: true }).click()
  await expect(page.getByRole('heading', { name: '订阅账户', exact: true })).toBeVisible()
})

test('mobile native clipboard accepts a Shadowrocket write without consuming quota', async ({ page, browserName }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await signIn(page)
  const account = (await (await page.request.get('/api/workspace?view=accounts&q=lin.design')).json()).users[0]
  const before = (await (await page.request.get(`/api/users/${account.id}/subscription`)).json()).subscription.accessCount
  await loaded(page, '/users')
  // Chromium headless starts with clipboard permission denied. Grant this test
  // origin explicitly, as a user would allow access; do not replace the API.
  // WebKit keeps its native gesture requirement without a permissions override.
  if (browserName === 'chromium') await page.context().grantPermissions(['clipboard-read', 'clipboard-write'], { origin: new URL(page.url()).origin })
  expect(await page.evaluate(() => typeof navigator.clipboard?.write === 'function')).toBe(true)
  await page.getByRole('button', { name: '复制 lin.design@example.test 的 Shadowrocket 链接', exact: true }).click()
  await expect(page.getByText('已复制 Shadowrocket 链接', { exact: true })).toBeVisible()
  const after = (await (await page.request.get(`/api/users/${account.id}/subscription`)).json()).subscription.accessCount
  expect(after).toBe(before)
  if (browserName === 'chromium') {
    const text = await page.evaluate(() => navigator.clipboard.readText())
    expect(text.startsWith('sub://')).toBe(true)
    const decoded = Buffer.from(text.slice(6), 'base64').toString('utf8')
    expect(decoded.startsWith(`${new URL(page.url()).origin}/api/sub/`)).toBe(true)
  }
})

async function matchingDeliveryActions(group) {
  const ordinary = group.locator('[data-link-kind="subscription"]')
  const rocket = group.locator('[data-link-kind="shadowrocket"]')
  await expect(ordinary).toBeVisible()
  await expect(rocket).toBeVisible()
  // Observe the final rendered theme, not different frames of a color transition.
  await group.evaluate(async element => {
    const animations = element.getAnimations({ subtree: true }).filter(animation => Number.isFinite(animation.effect?.getComputedTiming().endTime))
    await Promise.allSettled(animations.map(animation => animation.finished))
  })
  const style = element => {
    const css = getComputedStyle(element)
    const icon = getComputedStyle(element.querySelector('svg'))
    return [css.backgroundColor, css.color, css.borderRadius, css.fontSize, css.fontWeight, css.borderWidth, icon.width, icon.height, icon.strokeWidth]
  }
  expect(await rocket.evaluate(style)).toEqual(await ordinary.evaluate(style))
  expect((await rocket.boundingBox()).height).toBeGreaterThanOrEqual(44)
  expect((await ordinary.boundingBox()).height).toBeGreaterThanOrEqual(44)
  await expect(group.locator('.o-rocket-copy')).toHaveCount(0)
}
test('Shadowrocket follows shared action styling in light/dark desktop and compact mobile layouts', async ({ page, browserName }) => {
  await signIn(page)
  await mkdir('tests/browser/evidence', { recursive: true })
  for (const width of [1440, 390, 320]) for (const theme of ['light', 'dark']) {
    await page.setViewportSize({ width, height: width > 1000 ? 1000 : 844 })
    await loaded(page, '/users')
    await page.evaluate(dark => document.documentElement.classList.toggle('dark', dark), theme === 'dark')
    const rocket = page.getByRole('button', { name: '复制 lin.design@example.test 的 Shadowrocket 链接', exact: true })
    await rocket.scrollIntoViewIfNeeded()
    const group = rocket.locator('..')
    await matchingDeliveryActions(group)
    const box = await group.boundingBox()
    expect(box.x).toBeGreaterThanOrEqual(0)
    expect(box.x + box.width).toBeLessThanOrEqual(width + 1)
    await rocket.focus()
    expect(await rocket.evaluate(el => getComputedStyle(el).outlineStyle)).not.toBe('none')
    await noOverflow(page)
    await page.screenshot({ path: `tests/browser/evidence/${browserName}-delivery-${width}-${theme}.png` })
  }
})
test('drawer and creation delivery actions share the UI and copy without consuming access counts', async ({ page, browserName }) => {
  const database = new URL(process.env.DATABASE_URL || 'invalid:')
  if (process.env.WORKSPACE_E2E !== '1' || !['localhost', '127.0.0.1'].includes(database.hostname) || database.pathname !== '/workspace_e2e') throw new Error('Delivery fixtures require local workspace_e2e.')
  await page.setViewportSize({ width: 390, height: 844 })
  await signIn(page)
  await page.addInitScript(() => {
    window.ClipboardItem = undefined
    window.__deliveryText = ''
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async text => { window.__deliveryText = text } } })
  })
  const contentRequests = []
  page.on('request', request => { if (new URL(request.url()).pathname.startsWith('/api/sub/')) contentRequests.push(request.url()) })
  await loaded(page, '/users')
  const account = (await (await page.request.get('/api/workspace?view=accounts&q=lin.design')).json()).users[0]
  const metadata = async id => (await (await page.request.get(`/api/users/${id}/subscription`)).json()).subscription
  async function verifyCopies(dialog, id, label) {
    const before = await metadata(id)
    const group = dialog.getByRole('group', { name: '订阅链接交付', exact: true })
    for (const theme of ['light', 'dark']) {
      await page.evaluate(dark => document.documentElement.classList.toggle('dark', dark), theme === 'dark')
      await matchingDeliveryActions(group)
      expect(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true)
      await page.screenshot({ path: `tests/browser/evidence/${browserName}-delivery-${label}-${theme}.png` })
    }
    const rocket = group.locator('[data-link-kind="shadowrocket"]')
    await rocket.focus()
    await rocket.press('Enter')
    await expect.poll(() => page.evaluate(() => window.__deliveryText.startsWith('sub://'))).toBe(true)
    const value = await page.evaluate(() => window.__deliveryText)
    expect(Buffer.from(value.slice(6), 'base64').toString('utf8')).toBe(`${new URL(page.url()).origin}/api/sub/${before.token}`)
    await expect(rocket).toBeEnabled()
    await group.locator('[data-link-kind="subscription"]').click()
    await expect.poll(() => page.evaluate(() => window.__deliveryText)).toBe(`${new URL(page.url()).origin}/api/sub/${before.token}`)
    await expect(rocket).toBeEnabled()
    expect((await metadata(id)).accessCount).toBe(before.accessCount)
  }
  await page.getByRole('button', { name: '管理 lin.design@example.test', exact: true }).click()
  let dialog = page.getByRole('dialog')
  await dialog.getByRole('button', { name: '链接与额度', exact: true }).click()
  await verifyCopies(dialog, account.id, 'drawer')
  await dialog.getByRole('button', { name: '关闭详情', exact: true }).click()
  let createdId
  try {
    await page.getByRole('button', { name: '创建账户', exact: true }).click()
    dialog = page.getByRole('dialog')
    await dialog.getByRole('textbox', { name: '账户邮箱', exact: true }).fill(`delivery-${browserName}-${Date.now()}@example.test`)
    const responsePromise = page.waitForResponse(response => new URL(response.url()).pathname === '/api/users' && response.request().method() === 'POST')
    await dialog.getByRole('button', { name: '创建账户', exact: true }).click()
    const response = await responsePromise
    expect(response.status()).toBe(200)
    createdId = (await response.json()).user.id
    await expect(dialog.getByRole('heading', { name: '账户已准备好', exact: true })).toBeVisible()
    await verifyCopies(dialog, createdId, 'created')
    expect(contentRequests).toEqual([])
  } finally {
    if (createdId) expect((await page.request.delete(`/api/users/${createdId}`)).status()).toBe(200)
  }
})

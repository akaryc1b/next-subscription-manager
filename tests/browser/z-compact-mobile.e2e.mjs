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

test('mobile native clipboard accepts a Shadowrocket write without consuming quota', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await signIn(page)
  const account = (await (await page.request.get('/api/workspace?view=accounts&q=lin.design')).json()).users[0]
  const before = (await (await page.request.get(`/api/users/${account.id}/subscription`)).json()).subscription.accessCount
  await loaded(page, '/users')
  // Real browser clipboard write, no adapter or permission bypass. Reading/pasting
  // into the external Shadowrocket application still requires a physical device.
  expect(await page.evaluate(() => typeof navigator.clipboard?.write === 'function')).toBe(true)
  await page.getByRole('button', { name: '复制 lin.design@example.test 的 Shadowrocket 链接', exact: true }).click()
  await expect(page.getByText('已复制 Shadowrocket 链接', { exact: true })).toBeVisible()
  const after = (await (await page.request.get(`/api/users/${account.id}/subscription`)).json()).subscription.accessCount
  expect(after).toBe(before)
})

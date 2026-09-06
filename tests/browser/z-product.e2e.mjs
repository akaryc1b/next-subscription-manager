import { test, expect } from '@playwright/test'
import { mkdir, readFile } from 'node:fs/promises'

// Reuse the legitimate session established by workspace.e2e.mjs in this isolated
// browser acceptance job. Never disable authentication or production rate limits.
async function authenticated(page) {
  const state = JSON.parse(await readFile('tests/browser/.auth/state.json', 'utf8'))
  await page.context().addCookies(state.cookies)
}
async function loaded(page, path) {
  await page.goto(path)
  await expect(page.locator('.o-page')).toBeVisible()
  await expect(page.locator('.o-loading')).toHaveCount(0)
  await expect(page.locator('.o-problem')).toHaveCount(0)
}
async function capture(page, name) {
  await mkdir('tests/browser/evidence', { recursive: true })
  await page.screenshot({ path: `tests/browser/evidence/${name}.png`, animations: 'disabled' })
}
async function noOverflow(page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true)
  const main = page.locator('.o-main')
  if (await main.count()) expect(await main.evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true)
}

for (const viewport of [{ name: 'desktop', width: 1440, height: 1000 }, { name: 'mobile', width: 390, height: 844 }]) {
  test(`${viewport.name}: entry and settings are complete product surfaces`, async ({ page }) => {
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    await page.setViewportSize({ width: viewport.width, height: viewport.height })
    await page.goto('/login')
    await expect(page.getByRole('heading', { name: '回到你的工作空间。' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'GitHub', exact: true })).toHaveCount(0)
    await noOverflow(page)
    await capture(page, `${viewport.name}-login`)
    await page.getByLabel('密码', { exact: true }).fill('non-credential-visibility-check')
    await page.getByRole('button', { name: '显示密码', exact: true }).click()
    await expect(page.getByLabel('密码', { exact: true })).toHaveAttribute('type', 'text')
    await page.getByRole('button', { name: '隐藏密码', exact: true }).click()
    await page.goto('/activate')
    await expect(page.locator('.o-problem')).toContainText('激活链接不完整')
    await expect(page.getByRole('link', { name: '返回登录' })).toBeVisible()
    await noOverflow(page)
    await capture(page, `${viewport.name}-invitation-unavailable`)
    await authenticated(page)
    await loaded(page, '/settings')
    await expect(page.getByText('当前会话', { exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: '保留此方式' })).toBeDisabled()
    await noOverflow(page)
    await capture(page, `${viewport.name}-settings`)
    await page.locator('#appearance').scrollIntoViewIfNeeded()
    await capture(page, `${viewport.name}-settings-appearance`)
    expect(errors).toEqual([])
  })
}

test('settings appearance survives a reload without fictitious style toggles', async ({ page }) => {
  await authenticated(page)
  await loaded(page, '/settings')
  await page.getByRole('button', { name: '深色 · 夜间' }).click()
  await page.reload()
  await expect(page.locator('html')).toHaveClass(/dark/)
  await expect(page.getByRole('button', { name: '深色 · 夜间' })).toHaveAttribute('aria-pressed', 'true')
  await page.locator('#sessions').scrollIntoViewIfNeeded()
  await capture(page, 'desktop-settings-security-dark')
})

test('failed settings reads do not enable authentication removal', async ({ page }) => {
  await authenticated(page)
  await page.route('**/api/users/*/auth-methods', route => route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: '验收：读取失败' }) }))
  await page.goto('/settings')
  await expect(page.locator('#authentication .o-problem')).toContainText('验收：读取失败')
  await expect(page.getByRole('button', { name: '解除绑定', exact: true })).toHaveCount(0)
  await page.unroute('**/api/users/*/auth-methods')
  await page.locator('#authentication').getByRole('button', { name: '重新加载' }).click()
  await expect(page.getByRole('button', { name: '保留此方式' })).toBeDisabled()
})

test('unavailable invitations can retry without showing an editable account', async ({ page }) => {
  await page.route('**/api/activate/verify?*', route => route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: '验收：网络失败' }) }))
  await page.goto('/activate?token=invalid-fixture')
  await expect(page.locator('.o-problem')).toContainText('验收：网络失败')
  await expect(page.getByLabel('登录密码', { exact: true })).toHaveCount(0)
  await page.unroute('**/api/activate/verify?*')
  await page.getByRole('button', { name: '重新验证' }).click()
  await expect(page.locator('.o-problem')).toContainText('不存在')
})

test('Enter in quota writes only quota, not account authorization', async ({ page }) => {
  await authenticated(page)
  const account = (await (await page.request.get('/api/workspace?view=accounts&q=quota.test')).json()).users[0]
  await loaded(page, `/users?account=${account.id}`)
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('button', { name: '链接与额度', exact: true }).click()
  const writes = []
  page.on('request', request => { if (['PUT', 'PATCH'].includes(request.method())) writes.push({ path: new URL(request.url()).pathname, method: request.method() }) })
  await dialog.getByLabel('允许的总访问次数').fill('17')
  await dialog.getByLabel('允许的总访问次数').press('Enter')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  expect(writes).toEqual([{ path: `/api/users/${account.id}/subscription`, method: 'PATCH' }])
  const after = (await (await page.request.get(`/api/users/${account.id}/subscription`)).json()).subscription
  expect(after.maxAccess).toBe(17)
  expect(after.accessCount).toBe(1)
})

for (const direction of ['back', 'forward']) {
  test(`unsaved edits survive browser ${direction} and history still works after discard`, async ({ page }) => {
    await authenticated(page)
    await loaded(page, '/users')
    await page.getByRole('button', { name: '管理 lin.design@example.test', exact: true }).click()
    await expect(page.getByRole('dialog').getByLabel('账户邮箱', { exact: true })).toBeVisible()
    const accountUrl = page.url()
    if (direction === 'forward') {
      await page.getByRole('dialog').getByRole('link', { name: '日常使用 · 主配置' }).click()
      await expect(page).toHaveURL(/\/configs\?config=/)
      await page.evaluate(() => history.back())
      await expect(page).toHaveURL(accountUrl)
    }
    const dialog = page.getByRole('dialog')
    await dialog.getByRole('button', { name: '链接与额度', exact: true }).click()
    await dialog.getByLabel('允许的总访问次数').fill('77')
    await page.evaluate(value => { if (value === 'back') history.back(); else history.forward() }, direction)
    await expect(page.getByText('还有未保存的修改。请先保存，或关闭编辑并确认放弃。', { exact: true })).toBeVisible()
    await expect(page).toHaveURL(accountUrl)
    await expect(dialog.getByLabel('允许的总访问次数')).toHaveValue('77')
    await dialog.getByRole('button', { name: '关闭', exact: true }).click()
    await page.getByRole('button', { name: '放弃修改', exact: true }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await page.evaluate(value => { if (value === 'back') history.back(); else history.forward() }, direction)
    await expect(page).toHaveURL(direction === 'back' ? /\/users$/ : /\/configs\?config=/)
  })
}

test('reduced motion disables CSS artwork and re-enables it only with no preference', async ({ page }) => {
  await authenticated(page)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await loaded(page, '/dashboard')
  expect(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(true)
  await expect(page.locator('.o-art-float')).toHaveCSS('animation-name', 'none')
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await expect(page.locator('.o-art-float')).toHaveCSS('animation-name', 'orbit-float')
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await expect(page.locator('.o-art-float')).toHaveCSS('animation-name', 'none')
})

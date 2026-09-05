import { test, expect } from '@playwright/test'
import { mkdir, readFile } from 'node:fs/promises'

const evidence = 'tests/browser/evidence'
const authState = 'tests/browser/.auth/state.json'
async function signIn(page) {
  // Reuse a legitimately authenticated session. Do not weaken production rate limits.
  try {
    const saved = JSON.parse(await readFile(authState, 'utf8'))
    await page.context().addCookies(saved.cookies)
    return
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
  }
  const response = await page.request.post('/api/auth/sign-in/email', {
    headers: { origin: 'http://localhost:3000' },
    data: { email: process.env.E2E_ADMIN_EMAIL, password: process.env.E2E_ADMIN_PASSWORD },
  })
  expect(response.ok(), await response.text()).toBeTruthy()
  await mkdir('tests/browser/.auth', { recursive: true })
  await page.context().storageState({ path: authState })
}
async function loaded(page, path) {
  await page.goto(path)
  await expect(page.locator('.o-page')).toBeVisible()
  await expect(page.locator('.o-loading')).toHaveCount(0)
  await expect(page.locator('.o-problem')).toHaveCount(0)
}
async function capture(page, name) {
  await mkdir(evidence, { recursive: true })
  await page.screenshot({ path: `${evidence}/${name}.png`, animations: 'disabled' })
}
async function noOverflow(page) {
  const result = await page.evaluate(() => {
    const main = document.querySelector('.o-main')
    return { window: innerWidth, document: document.documentElement.scrollWidth, main: main?.clientWidth || 0, content: main?.scrollWidth || 0 }
  })
  expect(result.document).toBeLessThanOrEqual(result.window + 1)
  expect(result.content).toBeLessThanOrEqual(result.main + 1)
}

test('workspace API and pages keep administrator authorization', async ({ page }) => {
  const response = await page.request.get('/api/workspace')
  expect([401, 403]).toContain(response.status())
  await page.goto('/dashboard')
  await expect(page).toHaveURL(/\/login/)
})

for (const viewport of [{ name: 'desktop', width: 1440, height: 1000 }, { name: 'mobile', width: 390, height: 844 }]) {
  test(`${viewport.name}: real pages, responsive bounds, screenshots and event details`, async ({ page }) => {
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    await page.setViewportSize({ width: viewport.width, height: viewport.height })
    await signIn(page)
    for (const path of ['/dashboard', '/users', '/configs', '/calendar', '/monitor']) {
      await loaded(page, path)
      await noOverflow(page)
      await capture(page, `${viewport.name}-${path.slice(1)}`)
    }
    await page.locator('.o-event').first().click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByText('来源 IP', { exact: true })).toBeVisible()
    await capture(page, `${viewport.name}-event-detail`)
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).toHaveCount(0)
    expect(errors).toEqual([])
  })
}

test('command search is keyboard operable and account results open real details', async ({ page }) => {
  await signIn(page)
  await loaded(page, '/dashboard')
  await page.keyboard.press('Control+k')
  const search = page.getByRole('combobox', { name: '搜索页面、账户或配置' })
  await search.fill('lin.design')
  await expect(page.getByRole('option', { name: /lin.design/ })).toBeVisible()
  await search.press('ArrowDown')
  await search.press('Enter')
  await expect(page).toHaveURL(/account=/)
  await expect(page.getByRole('dialog').getByRole('heading', { name: 'lin.design@example.test' })).toBeVisible()
  await capture(page, 'desktop-account-authorization')
})

test('new account handoff persists authorization and exposes the activation result', async ({ page }) => {
  await signIn(page)
  await loaded(page, '/users?new=1')
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('账户邮箱', { exact: true }).fill('new.browser@example.test')
  await dialog.getByLabel(/日常使用/).check()
  await dialog.getByRole('button', { name: '创建账户', exact: true }).click()
  await expect(dialog.getByText('账户已创建，授权配置已保存。')).toBeVisible()
  await expect(dialog.locator('.o-activation-link')).toContainText('/activate?token=')
  const result = await page.request.get('/api/workspace?view=accounts&q=new.browser')
  const data = await result.json()
  expect(data.users).toHaveLength(1)
  expect(data.users[0].userConfigs).toHaveLength(1)
  expect(data.users[0].subscription).not.toHaveProperty('token')
  await capture(page, 'desktop-account-handoff')
})

test('quota changes are real and merely opening the panel does not consume access', async ({ page }) => {
  await signIn(page)
  const response = await page.request.get('/api/workspace?view=accounts&q=quota.test')
  const account = (await response.json()).users[0]
  await loaded(page, `/users?account=${account.id}`)
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('button', { name: '链接与额度', exact: true }).click()
  await expect(dialog.getByText('1 次', { exact: true })).toBeVisible()
  await dialog.getByLabel('允许的总访问次数').fill('9')
  await dialog.getByRole('button', { name: '保存额度', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  const after = await page.request.get(`/api/users/${account.id}/subscription`)
  const data = (await after.json()).subscription
  expect(data.maxAccess).toBe(9)
  expect(data.accessCount).toBe(1)
})

test('invalid YAML is rejected before publishing, and destructive cancellation does not write', async ({ page }) => {
  await signIn(page)
  const profiles = await (await page.request.get('/api/workspace?view=configs')).json()
  const profile = profiles.configs.find(item => item.isActive)
  await loaded(page, `/configs?config=${profile.id}`)
  const dialog = page.getByRole('dialog')
  const original = await dialog.getByLabel('YAML 配置内容').inputValue()
  await dialog.getByLabel('YAML 配置内容').fill('invalid: [')
  await dialog.getByRole('button', { name: '检查 YAML 语法' }).click()
  await expect(dialog.getByRole('alert')).toBeVisible()
  await dialog.getByLabel('YAML 配置内容').fill(original)
  await dialog.getByRole('button', { name: '删除配置', exact: true }).click()
  await expect(page.getByRole('heading', { name: '永久删除这份配置？' })).toBeVisible()
  await page.getByRole('button', { name: '取消', exact: true }).click()
  const result = await page.request.get(`/api/workspace?view=config&id=${profile.id}`)
  expect(result.status()).toBe(200)
})

test('a failed read is not rendered as healthy empty data', async ({ page }) => {
  await signIn(page)
  await page.route('**/api/workspace', route => route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: '验收：读取失败' }) }))
  await page.goto('/dashboard')
  await expect(page.getByRole('alert')).toContainText('验收：读取失败')
  await expect(page.getByRole('heading', { name: /没有待处理/ })).toHaveCount(0)
  await page.unroute('**/api/workspace')
  await page.getByRole('button', { name: '重新加载' }).click()
  await expect(page.locator('.o-hero')).toBeVisible()
})

test('dark appearance and reduced motion remain usable', async ({ page }) => {
  await signIn(page)
  await loaded(page, '/dashboard')
  await page.getByRole('button', { name: '切换深色主题' }).click()
  await expect(page.locator('html')).toHaveClass(/dark/)
  expect(await page.locator('.o-art-float').evaluate(element => getComputedStyle(element).animationName)).toBe('none')
  await noOverflow(page)
  await capture(page, 'desktop-dark')
})

test('unsaved quota cannot disappear on close or an internal link', async ({ page }) => {
  await signIn(page)
  const response = await page.request.get('/api/workspace?view=accounts&q=quota.test')
  const account = (await response.json()).users[0]
  await loaded(page, `/users?account=${account.id}`)
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('button', { name: '链接与额度' }).click()
  await dialog.getByLabel('允许的总访问次数').fill('77')
  await dialog.getByRole('link', { name: '查看访问记录' }).click()
  await expect(page).toHaveURL(/\/users\?account=/)
  await dialog.getByRole('button', { name: '关闭', exact: true }).click()
  await expect(page.getByRole('heading', { name: '放弃未保存的修改？' })).toBeVisible()
  await page.getByRole('button', { name: '取消', exact: true }).click()
  await expect(dialog.getByLabel('允许的总访问次数')).toHaveValue('77')
})

test('clipboard rejection never reports a copied subscription', async ({ page }) => {
  await signIn(page)
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: () => Promise.reject(new Error('验收：剪贴板权限被拒绝')) }, configurable: true })
  })
  await loaded(page, '/users')
  await page.getByRole('button', { name: '复制 lin.design@example.test 的订阅链接' }).click()
  await expect(page.getByText('验收：剪贴板权限被拒绝')).toBeVisible()
  await expect(page.getByText('已复制订阅链接，请仅交给授权用户')).toHaveCount(0)
})

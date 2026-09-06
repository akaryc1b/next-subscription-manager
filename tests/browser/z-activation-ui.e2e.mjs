import { test, expect } from '@playwright/test'
import { mkdir } from 'node:fs/promises'

// Deliberately fixture-driven UI coverage. These screenshots validate rendering
// and interaction, not the real activation token's database consumption.
for (const viewport of [{ name: 'desktop', width: 1440, height: 1000 }, { name: 'mobile', width: 390, height: 844 }]) {
  test(`${viewport.name}: activation form, mismatch and completion states with explicit fixtures`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height })
    let submissions = 0
    await page.route('**/api/activate/verify?*', route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ email: 'invite.preview@example.test', displayName: '邀请账户' }),
    }))
    await page.route('**/api/activate/setup', route => {
      submissions++
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) })
    })
    await page.goto('/activate?token=ui-fixture-only')
    await expect(page.getByRole('heading', { name: '欢迎，邀请账户。' })).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true)
    await mkdir('tests/browser/evidence', { recursive: true })
    await page.screenshot({ path: `tests/browser/evidence/${viewport.name}-activation-ui-fixture.png`, animations: 'disabled' })
    await page.getByLabel('登录密码', { exact: true }).fill('UI-fixture-input-only')
    await page.getByLabel('确认密码', { exact: true }).fill('Different-fixture-input')
    await page.getByRole('button', { name: '完成激活', exact: true }).click()
    await expect(page.locator('.o-problem')).toContainText('两次输入的密码不一致')
    expect(submissions).toBe(0)
    await page.getByLabel('确认密码', { exact: true }).fill('UI-fixture-input-only')
    await page.getByRole('button', { name: '完成激活', exact: true }).click()
    await expect(page.getByRole('heading', { name: '账户已激活。' })).toBeVisible()
    expect(submissions).toBe(1)
    await expect(page.getByText('接下来，使用你的订阅链接。')).toBeVisible()
    await expect(page).toHaveURL(/\/activate\?token=ui-fixture-only$/)
    await expect(page.getByLabel('登录密码', { exact: true })).toHaveCount(0)
    await page.screenshot({ path: `tests/browser/evidence/${viewport.name}-activation-complete-ui-fixture.png`, animations: 'disabled' })
  })

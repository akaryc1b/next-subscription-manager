import { test, expect } from '@playwright/test'

for (const width of [390, 1440]) {
  test(`retired activation at ${width}px has no password form or false success`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 })
    await page.goto('/activate?token=retired-test-fixture')
    await expect(page.getByRole('heading', { name: '此链接已停用' })).toBeVisible()
    await expect(page.locator('form')).toHaveCount(0)
    await expect(page.getByRole('link', { name: '管理员登录', exact: true })).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true)
    await page.goto('/login?activated=1')
    await expect(page.getByRole('heading', { name: '管理员登录' })).toBeVisible()
    await expect(page.getByText(/账户已激活/)).toHaveCount(0)
  })
}

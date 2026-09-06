import { test, expect } from '@playwright/test'
import { readFile } from 'node:fs/promises'

test('dirty settings protect pointer and keyboard command entry until changes are discarded', async ({ page }) => {
  const state = JSON.parse(await readFile('tests/browser/.auth/state.json', 'utf8'))
  await page.context().addCookies(state.cookies)
  await page.goto('/settings')
  await expect(page.getByLabel('显示名称', { exact: true })).toBeVisible()
  const original = await page.getByLabel('显示名称', { exact: true }).inputValue()
  await page.getByLabel('显示名称', { exact: true }).fill('尚未保存的界面测试')
  await page.locator('.o-search-trigger').click()
  await expect(page.getByText('还有未保存的修改。请先保存，或关闭编辑并确认放弃。', { exact: true })).toBeVisible()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.keyboard.press('Control+k')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.getByLabel('显示名称', { exact: true })).toHaveValue('尚未保存的界面测试')
  await page.getByRole('button', { name: '撤销修改', exact: true }).click()
  await expect(page.getByLabel('显示名称', { exact: true })).toHaveValue(original)
  await page.locator('.o-search-trigger').click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.getByRole('option', { name: /订阅账户/ }).click()
  await expect(page).toHaveURL(/\/users$/)
})

import { test, expect } from '@playwright/test'
import { PrismaClient } from '@prisma/client'
import { randomUUID } from 'node:crypto'
import { readFile } from 'node:fs/promises'

const database = new URL(process.env.DATABASE_URL || 'invalid:')
if (process.env.WORKSPACE_E2E !== '1' || !['localhost', '127.0.0.1'].includes(database.hostname) || database.pathname !== '/workspace_e2e') {
  throw new Error('Editor boundary tests require the isolated local workspace_e2e database.')
}
const db = new PrismaClient()
const yaml = 'mixed-port: 7890\nproxies: []\nrules:\n  - MATCH,DIRECT\n'
test.afterAll(async () => { await db.$disconnect() })
async function setup(page) {
  const state = JSON.parse(await readFile('tests/browser/.auth/state.json', 'utf8'))
  await page.context().addCookies(state.cookies)
  return db.user.findUniqueOrThrow({ where: { email: process.env.E2E_ADMIN_EMAIL }, select: { id: true } })
}

for (const existing of [false, true]) {
  test(`${existing ? 'existing' : 'new'} account: Enter searches configurations without submitting authorization`, async ({ page }) => {
    const admin = await setup(page)
    const key = `editor-${randomUUID()}`
    const email = `${key}@example.test`
    const profile = await db.config.create({ data: { userId: admin.id, name: key, content: yaml } })
    let account = null
    const writes = []
    page.on('request', request => {
      if (['POST', 'PUT'].includes(request.method()) && /^\/api\/users(?:\/[^/]+)?$/.test(new URL(request.url()).pathname)) writes.push(request)
    })
    try {
      if (existing) account = await db.user.create({ data: { email } })
      await page.goto(existing ? `/users?account=${account.id}` : '/users?new=1')
      const drawer = page.getByRole('dialog')
      await drawer.getByLabel('账户邮箱', { exact: true }).fill(email)
      const search = drawer.getByLabel('查找配置', { exact: true })
      await search.fill(key)
      await search.press('Enter')
      await expect(drawer.getByRole('checkbox', { name: new RegExp(key) })).toBeVisible()
      await expect(search).toHaveValue(key)
      expect(writes).toHaveLength(0)
      if (!existing) expect(await db.user.count({ where: { email } })).toBe(0)
      await drawer.getByRole('checkbox', { name: new RegExp(key) }).check()
      await drawer.getByRole('button', { name: existing ? '保存修改' : '创建账户', exact: true }).click()
      if (existing) await expect(page.getByRole('dialog')).toHaveCount(0)
      else await expect(drawer.getByText('账户已创建，授权配置已保存。')).toBeVisible()
      expect(writes).toHaveLength(1)
      const saved = await db.user.findUniqueOrThrow({ where: { email }, include: { userConfigs: true } })
      expect(saved.userConfigs.map(item => item.configId)).toEqual([profile.id])
    } finally {
      await db.user.deleteMany({ where: { email } })
      await db.config.deleteMany({ where: { id: profile.id } })
    }
  })
}

for (const existing of [false, true]) {
  test(`${existing ? 'unassigned' : 'new'} configuration: pending save locks inputs and cannot discard later edits`, async ({ page }) => {
    const admin = await setup(page)
    const name = `save-${randomUUID()}`
    const updatedYaml = yaml.replace('7890', '7891')
    let profile = null
    let release
    const gate = new Promise(resolve => { release = resolve })
    let writes = 0
    try {
      if (existing) profile = await db.config.create({ data: { userId: admin.id, name, content: yaml } })
      await page.route('**/api/configs**', async route => {
        if (['POST', 'PUT'].includes(route.request().method())) { writes++; await gate }
        await route.continue()
      })
      await page.goto(existing ? `/configs?config=${profile.id}` : '/configs?new=1')
      const drawer = page.getByRole('dialog')
      await drawer.getByLabel('配置名称', { exact: true }).fill(name)
      await drawer.getByLabel('YAML 配置内容').fill(updatedYaml)
      if (existing) await drawer.getByLabel('启用这份配置').uncheck()
      await drawer.getByRole('button', { name: existing ? '保存配置' : '创建配置', exact: true }).click()
      await expect.poll(() => writes).toBe(1)
      await expect(drawer.getByLabel('配置名称', { exact: true })).toBeDisabled()
      await expect(drawer.getByLabel('YAML 配置内容')).toBeDisabled()
      await expect(drawer.getByRole('button', { name: '检查 YAML 语法' })).toBeDisabled()
      if (existing) await expect(drawer.getByLabel('启用这份配置')).toBeDisabled()
      await expect(drawer.getByRole('button', { name: '正在保存…' })).toBeDisabled()
      await drawer.getByRole('button', { name: '关闭详情', exact: true }).click()
      await page.keyboard.press('Escape')
      await expect(drawer).toBeVisible()
      await drawer.locator('form').dispatchEvent('submit')
      expect(writes).toBe(1)
      await expect(drawer.getByLabel('YAML 配置内容')).toHaveValue(updatedYaml)
      release()
      await expect(page.getByRole('dialog')).toHaveCount(0)
      const saved = await db.config.findUniqueOrThrow({ where: { userId_name: { userId: admin.id, name } } })
      expect(saved.content).toBe(updatedYaml.trim())
      expect(saved.isActive).toBe(!existing)
      expect(writes).toBe(1)
    } finally {
      release()
      await page.unrouteAll({ behavior: 'wait' })
      await db.config.deleteMany({ where: { userId: admin.id, name } })
    }
  })
}

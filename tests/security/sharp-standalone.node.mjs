import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, writeFile, realpath, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { retainNativeAlias } from '../../scripts/prepare-sharp-standalone.mjs'

test('standalone retains an unchanged native package with a relative alias and is idempotent', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'sharp-trace-'))
  try {
    const name = '@img/sharp-libvips-linuxmusl-x64'
    const relative = `node_modules/.pnpm/native/node_modules/${name}`
    const standalone = path.join(root, '.next/standalone')
    for (const base of [root, standalone]) {
      await mkdir(path.join(base, relative), { recursive: true })
      await writeFile(path.join(base, relative, 'package.json'), JSON.stringify({ name, version: '1.3.4' }))
      await writeFile(path.join(base, relative, 'versions.json'), '{"heif":"1.23.2","rsvg":"2.63.2"}')
    }
    const file = path.join(root, relative, 'package.json')
    await retainNativeAlias(root, standalone, file)
    await retainNativeAlias(root, standalone, file)
    assert.equal(await realpath(path.join(standalone, 'node_modules', name)), await realpath(path.join(standalone, relative)))
    await writeFile(path.join(standalone, relative, 'versions.json'), '{}')
    await assert.rejects(() => retainNativeAlias(root, standalone, file), /differs/)
    await assert.rejects(() => retainNativeAlias(path.join(root, 'elsewhere'), standalone, file), /inside node_modules/)
  } finally { await rm(root, { recursive: true, force: true }) }
})

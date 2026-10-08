import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { atLeast, validatePackages, validateNativeVersions, collectPackages } from '../../scripts/check-runtime-dependencies.mjs'
const patched = [{ name: 'next', version: '15.5.24', path: 'next' }, { name: 'sharp', version: '0.35.5', path: 'sharp' }, { name: 'source-map-js', version: '1.2.2', path: 'nested/source-map-js' }]
test('patched versions pass; malformed and prerelease versions fail closed', () => {
  assert.doesNotThrow(() => validatePackages(patched))
  for (const version of [undefined, '15.5.24-canary.1', 'bad', '15.5.23']) assert.equal(atLeast(version, '15.5.24'), false)
  assert.equal(atLeast('15.5.25', '15.5.24'), true)
})
test('each old dependency is rejected even alongside a patched duplicate', () => {
  for (const [name, version] of [['next', '15.5.21'], ['sharp', '0.35.3'], ['sharp', '0.35.4'], ['source-map-js', '1.2.1']]) {
    assert.throws(() => validatePackages([...patched, { name, version, path: 'old/nested/copy' }]), /Unpatched/)
  }
})
test('missing required packages and unreviewed Next release lines fail', () => {
  assert.throws(() => validatePackages([]), /Missing/)
  assert.throws(() => validatePackages([{ ...patched[0], version: '16.3.3' }, patched[1]]), /release line/)
  assert.doesNotThrow(() => validatePackages(patched.slice(0, 2)))
})
test('actual native library versions are validated, not just the sharp wrapper', () => {
  assert.doesNotThrow(() => validateNativeVersions({ heif: '1.23.2', rsvg: '2.63.2' }))
  for (const versions of [{}, { heif: '1.23.1', rsvg: '2.63.2' }, { heif: '1.23.2', rsvg: '2.63.1' }]) assert.throws(() => validateNativeVersions(versions), /native library/)
})
test('physical pnpm package trees expose nested old copies', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'runtime-deps-'))
  try {
    for (const [index, pkg] of [...patched, { name: 'source-map-js', version: '1.2.1' }].entries()) {
      const directory = path.join(root, '.pnpm', String(index), 'node_modules', pkg.name)
      await mkdir(directory, { recursive: true })
      await writeFile(path.join(directory, 'package.json'), JSON.stringify(pkg))
    }
    const packages = await collectPackages(root)
    assert.equal(packages.length, 4)
    assert.throws(() => validatePackages(packages), /Unpatched source-map-js/)
  } finally { await rm(root, { recursive: true, force: true }) }
})

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import { blockingFindings } from '../../scripts/check-trivy-report.mjs'

const finding = (Severity, extra = {}) => ({ Severity, VulnerabilityID: 'CVE-test', PkgName: 'test-package', InstalledVersion: '1.0.0', ...extra })
const report = vulnerabilities => ({ SchemaVersion: 2, ArtifactType: 'container_image', Results: [{ Target: 'image (alpine)', Vulnerabilities: vulnerabilities }] })

test('valid clean image report passes', () => assert.deepEqual(blockingFindings(report([])), []))
test('omitted vulnerability array is a valid clean result', () => assert.deepEqual(blockingFindings(report(undefined)), []))
test('high and critical findings block, including unfixed findings', () => {
  const result = blockingFindings(report([finding('HIGH'), finding('CRITICAL'), finding('MEDIUM')]))
  assert.equal(result.length, 2)
})
test('other severities do not silently change the existing release policy', () => assert.equal(blockingFindings(report([finding('LOW'), finding('MEDIUM'), finding('UNKNOWN')])).length, 0))
test('missing, empty or non-array Results never passes', () => {
  for (const value of [undefined, [], {}, null]) assert.throws(() => blockingFindings({ ...report([]), Results: value }))
})
test('wrong report type or schema is rejected', () => {
  for (const value of [{}, null, [], { ...report([]), SchemaVersion: 1 }, { ...report([]), ArtifactType: 'filesystem' }]) assert.throws(() => blockingFindings(value))
})
test('malformed result and vulnerability arrays are rejected', () => {
  assert.throws(() => blockingFindings({ ...report([]), Results: [null] }))
  assert.throws(() => blockingFindings(report({})))
})
test('missing severity or vulnerability identity is not treated as safe', () => {
  for (const value of [{}, finding('typo'), finding('HIGH', { PkgName: '' }), finding('HIGH', { VulnerabilityID: '' })]) assert.throws(() => blockingFindings(report([value])))
})
test('CLI returns distinct statuses for safe, blocked and unreadable reports', () => {
  const dir = mkdtempSync(join(tmpdir(), 'trivy-gate-'))
  const script = fileURLToPath(new URL('../../scripts/check-trivy-report.mjs', import.meta.url))
  const run = name => spawnSync(process.execPath, [script, join(dir, name)], { encoding: 'utf8', timeout: 5000 })
  try {
    writeFileSync(join(dir, 'safe.json'), JSON.stringify(report([])))
    writeFileSync(join(dir, 'blocked.json'), JSON.stringify(report([finding('HIGH')])))
    writeFileSync(join(dir, 'broken.json'), '{invalid')
    assert.equal(run('safe.json').status, 0)
    assert.equal(run('blocked.json').status, 1)
    assert.equal(run('broken.json').status, 2)
    assert.equal(run('missing.json').status, 2)
  } finally { rmSync(dir, { recursive: true, force: true }) }
})

test('the expected image platform must match scanned image metadata', () => {
  const arm = { ...report([]), Metadata: { ImageConfig: { os: 'linux', architecture: 'arm64' } } }
  assert.deepEqual(blockingFindings(arm, 'linux/arm64'), [])
  assert.throws(() => blockingFindings(arm, 'linux/amd64'))
})
test('missing platform metadata and unsupported expectations are rejected', () => {
  assert.throws(() => blockingFindings(report([]), 'linux/arm64'))
  assert.throws(() => blockingFindings(report([]), 'invalid'))
})

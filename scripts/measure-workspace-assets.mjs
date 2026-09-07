import { readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { gzipSync } from 'node:zlib'
import assert from 'node:assert/strict'

const baseline = JSON.parse(readFileSync('tests/performance/workspace-baseline.json'))
const { pages } = JSON.parse(readFileSync('.next/app-build-manifest.json'))
const loadable = JSON.parse(readFileSync('.next/react-loadable-manifest.json'))
const routes = {}
for (const [page, previous] of Object.entries(baseline.routes)) {
  const keys = ['/layout', '/(dashboard)/layout', `/(dashboard)/${page}/page`]
  for (const key of keys) assert.ok(Array.isArray(pages[key]), `Missing build manifest route ${key}`)
  const files = [...new Set(keys.flatMap(key => pages[key]))].filter(file => file.endsWith('.js'))
  const after = { bytes: 0, gzipBytes: 0 }
  for (const file of files) {
    const content = readFileSync(`.next/${file}`)
    after.bytes += content.length
    after.gzipBytes += gzipSync(content).length
  }
  routes[page] = { before: previous, after, files, gzipReductionPercent: Number(((1 - after.gzipBytes / previous.gzipBytes) * 100).toFixed(1)) }
  assert.ok(after.gzipBytes < previous.gzipBytes, `${page} initial gzip JS must be below the original baseline`)
}
for (const [module, page] of [['command-palette', 'dashboard'], ['account-editor', 'users'], ['profile-editor', 'configs']]) {
  const entry = Object.entries(loadable).find(([key]) => key.includes(`./${module}`))
  assert.ok(entry, `Missing dynamic boundary for ${module}`)
  assert.ok(entry[1].files.some(file => file.endsWith('.js') && !routes[page].files.includes(file)), `${module} must have a deferred JS chunk`)
}
mkdirSync('tests/browser/evidence', { recursive: true })
writeFileSync('tests/browser/evidence/route-assets.json', JSON.stringify({ baseline: baseline.revision, method: baseline.method, routes }, null, 2))
console.table(Object.fromEntries(Object.entries(routes).map(([key,v]) => [key, { beforeGzip: v.before.gzipBytes, afterGzip: v.after.gzipBytes, reduction: `${v.gzipReductionPercent}%` }])))

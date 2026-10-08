import { readdir, readFile, realpath } from 'node:fs/promises'
import path from 'node:path'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'

// Floors for the five October 2026 findings only, not a replacement for Trivy.
export const minimums = { next: '15.5.24', sharp: '0.35.5', 'source-map-js': '1.2.2' }
export function atLeast(version, floor) {
  if (typeof version !== 'string' || !/^\d+\.\d+\.\d+$/.test(version)) return false
  const actual = version.split('.').map(Number), wanted = floor.split('.').map(Number)
  for (let i = 0; i < 3; i++) if (actual[i] !== wanted[i]) return actual[i] > wanted[i]
  return true
}
export function validatePackages(packages) {
  for (const required of ['next', 'sharp']) {
    if (!packages.some(pkg => pkg.name === required)) throw new Error(`Missing runtime dependency: ${required}`)
  }
  for (const pkg of packages) {
    if (!Object.hasOwn(minimums, pkg.name)) continue
    if (!atLeast(pkg.version, minimums[pkg.name])) throw new Error(`Unpatched ${pkg.name}@${pkg.version} at ${pkg.path}`)
    // A different framework release line requires an explicit policy review.
    if (pkg.name === 'next' && !pkg.version.startsWith('15.5.')) throw new Error('Review security floors before changing the Next.js release line')
  }
}
export function validateNativeVersions(versions) {
  for (const [library, floor] of Object.entries({ heif: '1.23.2', rsvg: '2.63.2' })) {
    if (!atLeast(versions[library], floor)) throw new Error(`Missing or unpatched sharp native library ${library}: ${versions[library] ?? 'unknown'}`)
  }
}
export async function collectPackages(root) {
  const packages = [], seen = new Set(), queue = [root]
  while (queue.length) {
    const directory = await realpath(queue.pop())
    if (seen.has(directory)) continue
    seen.add(directory)
    const entries = await readdir(directory, { withFileTypes: true })
    if (entries.some(entry => entry.name === 'package.json' && entry.isFile())) {
      const pkg = JSON.parse(await readFile(path.join(directory, 'package.json'), 'utf8'))
      if (Object.hasOwn(minimums, pkg.name)) packages.push({ name: pkg.name, version: pkg.version, path: path.relative(root, directory) })
    }
    for (const entry of entries) {
      if (entry.name === '.bin') continue
      if (entry.isDirectory()) queue.push(path.join(directory, entry.name))
      // Physical package contents are already traversed; pnpm's aliases do not
      // need following and may point at files rather than directories.
    }
  }
  return packages.sort((a, b) => a.path.localeCompare(b.path))
}
export async function verifyRuntime(root = process.cwd()) {
  const packages = await collectPackages(path.join(root, 'node_modules'))
  validatePackages(packages)
  const rootRequire = createRequire(path.join(root, 'package.json'))
  const nextRequire = createRequire(rootRequire.resolve('next/package.json'))
  const sharp = nextRequire('sharp')
  validatePackages([...packages, { name: 'next', version: nextRequire('./package.json').version, path: 'active Next.js resolution' }, { name: 'sharp', version: sharp.versions.sharp, path: 'active sharp resolution' }])
  validateNativeVersions(sharp.versions)
  const png = await sharp({ create: { width: 2, height: 2, channels: 3, background: '#ffffff' } }).png().toBuffer()
  const result = await sharp(png).resize(1, 1).webp().toBuffer({ resolveWithObject: true })
  if (result.info.width !== 1 || result.info.height !== 1 || result.info.format !== 'webp') throw new Error('Native image processing smoke test failed')
  return { scope: 'five reported dependency findings, not an intrusion check', node: process.version, platform: process.platform, arch: process.arch, packages, sharp: sharp.versions, imageSmokeTest: 'passed' }
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try { console.log(JSON.stringify(await verifyRuntime(), null, 2)) }
  catch (error) { console.error(error instanceof Error ? error.message : error); process.exitCode = 1 }
}

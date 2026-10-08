import { lstat, mkdir, readFile, realpath, symlink } from 'node:fs/promises'
import path from 'node:path'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import { validateNativeVersions } from './check-runtime-dependencies.mjs'

function contained(root, target) {
  const relative = path.relative(root, target)
  if (!relative || relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) throw new Error('Native dependency must remain inside node_modules')
  return relative
}

// Recreate the optional dependency alias lost when the tracer copies only files.
// No package download, version fabrication or native binary replacement occurs.
export async function retainNativeAlias(root, standalone, packageFile) {
  const source = path.dirname(await realpath(packageFile))
  const relative = contained(path.join(root, 'node_modules'), source)
  const destination = path.join(standalone, 'node_modules', relative)
  const pkg = JSON.parse(await readFile(packageFile, 'utf8'))
  if (!/^@img\/sharp-libvips-[a-z0-9-]+$/.test(pkg.name)) throw new Error('Unexpected native package name')
  for (const file of ['package.json', 'versions.json']) {
    const [original, traced] = await Promise.all([readFile(path.join(source, file)), readFile(path.join(destination, file))])
    if (!original.equals(traced)) throw new Error(`Traced ${pkg.name}/${file} differs from the installed dependency`)
  }
  const alias = path.join(standalone, 'node_modules', pkg.name)
  await mkdir(path.dirname(alias), { recursive: true })
  try {
    await lstat(alias)
    if (await realpath(alias) !== await realpath(destination)) throw new Error('Refusing to replace a conflicting native dependency alias')
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
    await symlink(path.relative(path.dirname(alias), destination), alias, 'dir')
  }
  return { name: pkg.name, version: pkg.version, alias: path.relative(standalone, alias), target: path.relative(standalone, destination) }
}

export async function prepare(root = process.cwd()) {
  const require = createRequire(path.join(root, 'package.json'))
  const nextRequire = createRequire(require.resolve('next/package.json'))
  const sharpRequire = createRequire(nextRequire.resolve('sharp'))
  const sharp = nextRequire('sharp')
  console.log('Build-time sharp native versions:', JSON.stringify(sharp.versions))
  validateNativeVersions(sharp.versions)
  const libc = sharpRequire('detect-libc').familySync()
  const platform = process.platform === 'linux' && libc === 'musl' ? 'linuxmusl' : process.platform
  const name = `@img/sharp-libvips-${platform}-${process.arch}`
  const packageFile = sharpRequire.resolve(`${name}/package`)
  console.log('Standalone native metadata alias:', JSON.stringify(await retainNativeAlias(root, path.join(root, '.next/standalone'), packageFile)))
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try { await prepare() }
  catch (error) { console.error(error instanceof Error ? error.message : error); process.exitCode = 1 }
}

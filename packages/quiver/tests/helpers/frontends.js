// Runs each route front-end (Vite plugin, Bun plugin, CLI) on a pages directory
// and returns the module source it produces. Shared by the parity and front-end tests.
import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import viteQuiver from '../../src/node/vite.js'
import bunQuiver from '../../src/node/bun.js'

export const CLI = join(import.meta.dirname, '..', '..', 'bin', 'quiver.js')

/** @param {string} dir absolute pages dir */
export async function viaVite(dir) {
  const plugin = viteQuiver({ dir })
  plugin.configResolved({ root: '/' })
  const id = plugin.resolveId('quiver:routes')
  if (!id) throw new Error('quiver:routes did not resolve')
  return /** @type {string} */ (await plugin.load(id))
}

/**
 * A fake Bun plugin builder that records the callbacks `setup` registers.
 * @returns {{ build: any, resolvers: any[], loaders: any[] }}
 */
export function fakeBunBuild() {
  /** @type {any[]} */ const resolvers = []
  /** @type {any[]} */ const loaders = []
  return {
    resolvers,
    loaders,
    build: {
      onResolve: (/** @type {any} */ options, /** @type {any} */ callback) => resolvers.push({ options, callback }),
      onLoad: (/** @type {any} */ options, /** @type {any} */ callback) => loaders.push({ options, callback }),
    },
  }
}

/** @param {string} dir absolute pages dir */
export async function viaBun(dir) {
  const { build, resolvers, loaders } = fakeBunBuild()
  bunQuiver({ dir }).setup(build)
  const [resolver] = resolvers.filter((r) => r.options.filter.test('quiver:routes'))
  const resolved = resolver.callback({ path: 'quiver:routes' })
  const [loader] = loaders.filter((l) => l.options.namespace === resolved.namespace && l.options.filter.test(resolved.path))
  const result = await loader.callback(resolved)
  if (result.loader !== 'js') throw new Error(`unexpected loader ${result.loader}`)
  return result.contents
}

/**
 * Runs `node bin/quiver.js …args` in cwd.
 * @param {string[]} args
 * @param {string} [cwd]
 */
export function runCli(args, cwd = process.cwd()) {
  const { status, stdout, stderr } = spawnSync('node', [CLI, ...args], { cwd, encoding: 'utf8' })
  return { status, stdout, stderr }
}

/**
 * @param {string} dir absolute pages dir
 * @returns {{ source: string, out: string }}
 */
export function viaCli(dir) {
  const out = join(mkdtempSync(join(tmpdir(), 'quiver-cli-')), 'gen', 'routes.gen.js')
  const { status, stderr } = runCli(['routes', '--dir', dir, '--out', out])
  if (status !== 0) throw new Error(`quiver routes exited ${status}: ${stderr}`)
  return { source: readFileSync(out, 'utf8'), out }
}

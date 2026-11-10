// Vite plugin (TECH-SPEC §4.3, S-10…S-13): serves the virtual module
// `quiver:routes`, the route manifest for a pages directory.
//
//   // vite.config.js
//   import quiver from '@go4cas/quiver/vite'
//   export default { plugins: [quiver()] }
//
//   // main.js
//   import routes, { notFound } from 'quiver:routes'
//   await initRouter({ routes, notFound })
import { isAbsolute, join, relative, resolve } from 'node:path'
import { generateManifest, scanPages, toPosix } from './scanner.js'

const ID = 'quiver:routes'
const RESOLVED = '\0' + ID

/**
 * The parts of Vite's dev server the plugin uses. A local structural type, so the
 * published .d.ts needs no `vite` types and `vite` is not a peer (S-13).
 * @typedef {Object} ViteDevServerLike
 * @property {{ root: string }} config
 * @property {{ on(event: 'add' | 'unlink', listener: (file: string) => void): unknown }} watcher
 * @property {{ getModuleById(id: string): unknown, invalidateModule(mod: any): void }} moduleGraph
 * @property {{ send(payload: { type: 'full-reload', path?: string }): void }} ws
 */

/**
 * @typedef {Object} VitePluginLike
 * @property {string} name
 * @property {(config: { root: string }) => void} configResolved
 * @property {(id: string) => string | undefined} resolveId
 * @property {(id: string) => Promise<string | undefined>} load
 * @property {(server: ViteDevServerLike) => void} configureServer
 */

/**
 * @param {{ dir?: string }} [options] dir: the pages directory, relative to Vite's root; default 'src/pages'
 * @returns {VitePluginLike}
 */
export default function quiver(options = {}) {
  const dir = options.dir ?? 'src/pages'
  let absDir = resolve(dir)

  return {
    name: 'quiver:routes',

    configResolved(config) {
      absDir = resolve(config.root, dir)
    },

    resolveId(id) {
      return id === ID ? RESOLVED : undefined
    },

    // S-10: absolute specifiers. S-12: a scan error rejects, which fails
    // `vite build` and shows the error overlay in dev.
    async load(id) {
      if (id !== RESOLVED) return undefined
      const scan = await scanPages(absDir)
      return generateManifest(scan, (file) => toPosix(join(absDir, file)))
    },

    // S-11: adding or removing a page changes the manifest, so invalidate it and
    // reload the page. Edits to a page go through Vite's normal HMR. A file the
    // scanner skips (a path segment starting with `_` or `.`, S-1) is not a page,
    // so adding or removing it leaves the manifest as it is.
    configureServer(server) {
      /** @param {string} file */
      const onChange = (file) => {
        const rel = relative(absDir, file)
        if (!file.endsWith('.js') || rel.startsWith('..') || isAbsolute(rel)) return
        if (rel.split(/[\\/]/).some((part) => part.startsWith('_') || part.startsWith('.'))) return
        const mod = server.moduleGraph.getModuleById(RESOLVED)
        if (mod) server.moduleGraph.invalidateModule(mod)
        server.ws.send({ type: 'full-reload' })
      }
      server.watcher.on('add', onChange)
      server.watcher.on('unlink', onChange)
    },
  }
}

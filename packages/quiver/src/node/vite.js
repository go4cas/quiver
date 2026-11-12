// Vite plugin (TECH-SPEC §4.3, S-10…S-13, §12.3 S-60, S-61): serves the virtual
// modules `quiver:routes`, the route manifest for a pages directory, and
// `quiver:app`, the app manifest for a source directory (D42).
//
//   // vite.config.js
//   import quiver from '@go4cas/quiver/vite'
//   export default { plugins: [quiver()] }
//
//   // main.js
//   import app from 'quiver:app'
//   await createApp(app, { target: '#app' })
import { isAbsolute, join, relative, resolve } from 'node:path'
import { generateManifest, scanPages, toPosix } from './scanner.js'
import { generateApp, isAppFile, scanApp } from './conventions.js'

const ID = 'quiver:routes'
const RESOLVED = '\0' + ID
const APP_ID = 'quiver:app'
const APP_RESOLVED = '\0' + APP_ID

/**
 * The parts of Vite's dev server the plugin uses. A local structural type, so the
 * published .d.ts needs no `vite` types and `vite` is not a peer (S-13).
 * @typedef {Object} ViteDevServerLike
 * @property {{ root: string }} config
 * @property {{ on(event: 'add' | 'unlink' | 'change', listener: (file: string) => void): unknown }} watcher
 * @property {{ getModuleById(id: string): unknown, invalidateModule(mod: any): void }} moduleGraph
 * @property {{ send(payload: { type: 'full-reload', path?: string }): void }} ws
 */

/**
 * @typedef {Object} VitePluginLike
 * @property {string} name
 * @property {(config: { root: string }) => void} configResolved
 * @property {(id: string) => string | undefined} resolveId
 * @property {(this: PluginContextLike | void, id: string) => Promise<string | undefined>} load
 * @property {(server: ViteDevServerLike) => void} configureServer
 */

/**
 * The part of Vite's plugin context `load` uses (S-60).
 * @typedef {{ warn?: (message: string) => void }} PluginContextLike
 */

/**
 * @param {{ dir?: string, srcDir?: string }} [options] relative to Vite's root. srcDir: the
 *   source directory for `quiver:app`, default 'src'; dir: the pages directory, default `<srcDir>/pages`
 * @returns {VitePluginLike}
 */
export default function quiver(options = {}) {
  const src = options.srcDir ?? 'src'
  const dir = options.dir ?? join(src, 'pages')
  let absDir = resolve(dir)
  let absSrc = resolve(src)
  /** @type {string | undefined} the last `quiver:app` source served, to tell whether an edit changed it */
  let lastApp

  /** @returns {Promise<string>} */
  const appSource = async () => {
    const scan = await scanApp(absSrc, { pagesDir: absDir })
    return generateApp(scan, (file) => toPosix(join(absSrc, file)))
  }

  return {
    name: 'quiver:routes',

    configResolved(config) {
      absDir = resolve(config.root, dir)
      absSrc = resolve(config.root, src)
    },

    resolveId(id) {
      return id === ID ? RESOLVED : id === APP_ID ? APP_RESOLVED : undefined
    },

    // S-10: absolute specifiers. S-12: a scan error rejects, which fails
    // `vite build` and shows the error overlay in dev. S-60: warnings go to the
    // plugin context's warn (the terminal), never fail the build.
    async load(id) {
      if (id === RESOLVED) {
        const scan = await scanPages(absDir)
        return generateManifest(scan, (file) => toPosix(join(absDir, file)))
      }
      if (id !== APP_RESOLVED) return undefined
      const scan = await scanApp(absSrc, { pagesDir: absDir })
      const warn = this?.warn ? this.warn.bind(this) : (/** @type {string} */ m) => console.warn(m)
      for (const warning of scan.warnings) warn(warning)
      lastApp = generateApp(scan, (file) => toPosix(join(absSrc, file)))
      return lastApp
    },

    // S-11: adding or removing a page changes the manifest, so invalidate it and
    // reload the page. Edits to a page go through Vite's normal HMR. A file the
    // scanner skips (a path segment starting with `_` or `.`, S-1) is not a page,
    // so adding or removing it leaves the manifest as it is.
    //
    // S-61: for `quiver:app`, adding or removing a page, a `_middleware.js`, a
    // file in layouts/, middleware/ or views/, or app.config.js invalidates it
    // and reloads; editing a page re-scans and reloads only when the module
    // changed (its meta.nav or meta.layout). Only once the app has loaded it.
    configureServer(server) {
      /** @param {string} file */
      const isPage = (file) => {
        const rel = relative(absDir, file)
        if (!file.endsWith('.js') || rel.startsWith('..') || isAbsolute(rel)) return false
        return !rel.split(/[\\/]/).some((part) => part.startsWith('_') || part.startsWith('.'))
      }
      /** @param {string} id @returns {boolean} whether the module was loaded and is now invalid */
      const invalidate = (id) => {
        const mod = server.moduleGraph.getModuleById(id)
        if (mod) server.moduleGraph.invalidateModule(mod)
        return Boolean(mod)
      }

      /** @param {string} file */
      const onAddOrRemove = (file) => {
        const page = isPage(file)
        if (page) invalidate(RESOLVED)
        const app = isAppFile(absSrc, absDir, file) && invalidate(APP_RESOLVED)
        if (page || app) {
          lastApp = undefined
          server.ws.send({ type: 'full-reload' })
        }
      }
      /** @param {string} file */
      const onEdit = (file) => {
        if (!isPage(file) || lastApp === undefined || !server.moduleGraph.getModuleById(APP_RESOLVED)) return
        appSource().then((source) => {
          if (source === lastApp) return
          lastApp = undefined
          invalidate(APP_RESOLVED)
          server.ws.send({ type: 'full-reload' })
        }, () => {}) // a scan error shows on the next load
      }
      server.watcher.on('add', onAddOrRemove)
      server.watcher.on('unlink', onAddOrRemove)
      server.watcher.on('change', onEdit)
    },
  }
}

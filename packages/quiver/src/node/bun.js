// Bun plugin (TECH-SPEC §4.4, S-20…S-22): serves the virtual module
// `quiver:routes` to Bun.build, including with `splitting: true` (one chunk per page).
//
//   import quiver from '@go4cas/quiver/bun'
//   await Bun.build({ entrypoints: ['src/main.js'], outdir: 'dist', splitting: true, plugins: [quiver()] })
//
//   // main.js
//   import routes, { notFound } from 'quiver:routes'
//   await initRouter({ routes, notFound })
import { join, resolve } from 'node:path'
import { generateManifest, scanPages, toPosix } from './scanner.js'

/**
 * The parts of Bun's plugin builder the plugin uses. A local structural type, so
 * the published .d.ts needs no `bun-types` (S-22).
 * @typedef {Object} BunPluginBuilderLike
 * @property {(options: { filter: RegExp, namespace?: string },
 *   callback: (args: { path: string }) => { path: string, namespace?: string }) => unknown} onResolve
 * @property {(options: { filter: RegExp, namespace?: string },
 *   callback: (args: { path: string, namespace?: string }) => Promise<{ contents: string, loader: 'js' }>) => unknown} onLoad
 */

/**
 * @typedef {Object} BunPluginLike
 * @property {string} name
 * @property {(build: BunPluginBuilderLike) => void} setup
 */

/**
 * @param {{ dir?: string }} [options] dir: the pages directory, relative to process.cwd(); default 'src/pages'
 * @returns {BunPluginLike}
 */
export default function quiver(options = {}) {
  const absDir = resolve(options.dir ?? 'src/pages')

  return {
    name: 'quiver:routes',
    setup(build) {
      build.onResolve({ filter: /^quiver:routes$/ }, (args) => ({ path: args.path, namespace: 'quiver' }))
      build.onLoad({ filter: /.*/, namespace: 'quiver' }, async () => {
        const scan = await scanPages(absDir)
        return { contents: generateManifest(scan, (file) => toPosix(join(absDir, file))), loader: 'js' }
      })
    },
  }
}

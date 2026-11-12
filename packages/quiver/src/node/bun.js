// Bun plugin (TECH-SPEC §4.4, S-20…S-22, §12.3 S-62): serves the virtual modules
// `quiver:routes` and `quiver:app` to Bun.build, including with `splitting: true`
// (one chunk per page).
//
//   import quiver from '@go4cas/quiver/bun'
//   await Bun.build({ entrypoints: ['src/main.js'], outdir: 'dist', splitting: true, plugins: [quiver()] })
//
//   // main.js
//   import app from 'quiver:app'
//   await createApp(app, { target: '#app' })
import { join, resolve } from 'node:path'
import { generateManifest, scanPages, toPosix } from './scanner.js'
import { generateApp, scanApp } from './conventions.js'

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
 * @param {{ dir?: string, srcDir?: string }} [options] relative to process.cwd(). srcDir: the
 *   source directory for `quiver:app`, default 'src'; dir: the pages directory, default `<srcDir>/pages`
 * @returns {BunPluginLike}
 */
export default function quiver(options = {}) {
  const absSrc = resolve(options.srcDir ?? 'src')
  const absDir = options.dir === undefined ? join(absSrc, 'pages') : resolve(options.dir)

  return {
    name: 'quiver:routes',
    setup(build) {
      build.onResolve({ filter: /^quiver:(routes|app)$/ }, (args) => ({ path: args.path, namespace: 'quiver' }))
      build.onLoad({ filter: /.*/, namespace: 'quiver' }, async (args) => {
        if (args.path === 'quiver:app') {
          const scan = await scanApp(absSrc, { pagesDir: absDir })
          for (const warning of scan.warnings) console.warn(warning)
          return { contents: generateApp(scan, (file) => toPosix(join(absSrc, file))), loader: 'js' }
        }
        const scan = await scanPages(absDir)
        return { contents: generateManifest(scan, (file) => toPosix(join(absDir, file))), loader: 'js' }
      })
    },
  }
}

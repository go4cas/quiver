// Serves e2e/plain-app/ unbundled, with each recipe in index.json at
// quiver/<name>/ (where an app that installed it keeps it; recipe tests are not
// served) and @arrow-js/core's dist/ under vendor/ for the import map.
// Nothing from @go4cas/quiver. A local test server: it listens on 127.0.0.1 only.
//
//   PORT=5184 bun e2e/serve.js
import { readFileSync, realpathSync } from 'node:fs'
import { realpath, stat } from 'node:fs/promises'
import { dirname, join, sep } from 'node:path'

const HOST = '127.0.0.1'
const PORT = Number(process.env.PORT ?? 5184)
const RECIPES = join(import.meta.dir, '..')
const APP = join(import.meta.dir, 'plain-app')
const ARROW = join(dirname(Bun.resolveSync('@arrow-js/core/package.json', RECIPES)), 'dist')

/** @type {Record<string, string>} exact paths served from plain-app/ */
const FILES = { '': 'index.html', 'index.html': 'index.html', 'main.js': 'main.js' }

// URL prefix → the one folder it may read from: Arrow's dist/, and each recipe's
// folder (index.json's names, so nothing else under recipes/ is reachable).
const registry = /** @type {Record<string, { files: string[] }>} */ (
  JSON.parse(readFileSync(join(RECIPES, 'index.json'), 'utf8'))
)
/** @type {[string, string][]} */
const ROOTS = [
  ['vendor/@arrow-js/core/dist/', ARROW],
  ...Object.keys(registry).map((name) => /** @type {[string, string]} */ ([`quiver/${name}/`, join(RECIPES, name)])),
].map(([prefix, dir]) => [prefix, realpathSync(dir)])

/** @param {string} pathname @returns {string | null} the decoded path, or null when it is malformed or climbs */
function decode(pathname) {
  try {
    const path = decodeURIComponent(pathname)
    return /[\0\\]/.test(path) || path.split('/').some((s) => s === '.' || s === '..') ? null : path
  } catch {
    return null
  }
}

/**
 * The real path of the file for a site path, or null. Symlinks are resolved
 * first, so a link that points out of its root is not served.
 * @param {string} rel '/'-separated, already decoded, without the leading '/'
 */
async function fileFor(rel) {
  if (Object.hasOwn(FILES, rel)) return join(APP, FILES[rel])
  const entry = ROOTS.find(([prefix]) => rel.startsWith(prefix))
  if (!entry) return null
  const [prefix, top] = entry
  const inner = rel.slice(prefix.length)
  if (prefix.startsWith('quiver/') && inner.split('/').includes('tests')) return null
  try {
    const path = await realpath(join(top, inner))
    return path.startsWith(top + sep) && (await stat(path)).isFile() ? path : null
  } catch {
    return null
  }
}

const server = Bun.serve({
  hostname: HOST,
  port: PORT,
  async fetch(req) {
    const rel = decode(new URL(req.url).pathname.slice(1))
    if (rel === null) return new Response('Bad request', { status: 400 })
    const path = await fileFor(rel)
    return path ? new Response(Bun.file(path)) : new Response('Not found', { status: 404 })
  },
})

console.log(`Serving the plain Arrow app at http://${HOST}:${server.port}/`)

// A small local development server for the vanilla Arrow example. It serves this
// folder's index.html, data.json and src/, plus the files the import map needs
// from @arrow-js/core and this package under vendor/. Nothing is bundled or
// transformed. It listens on 127.0.0.1 only and is not meant for production.
//
//   PORT=3000 bun example/serve.js
import { realpathSync } from 'node:fs'
import { realpath, stat } from 'node:fs/promises'
import { dirname, join, sep } from 'node:path'

const HOST = '127.0.0.1'
const PORT = Number(process.env.PORT ?? 3000)
const ROOT = import.meta.dir

/** @type {Record<string, string>} exact paths served from this folder */
const FILES = { '': 'index.html', 'index.html': 'index.html', 'data.json': 'data.json' }

// URL prefix → the one folder it may read from.
/** @type {[string, string][]} */
const ROOTS = [
  ['src/', join(ROOT, 'src')],
  ['vendor/@arrow-js/core/dist/', join(dirname(Bun.resolveSync('@arrow-js/core/package.json', ROOT)), 'dist')],
  ['vendor/arrow-use/src/', join(ROOT, '..', 'src')],
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
  if (Object.hasOwn(FILES, rel)) return join(ROOT, FILES[rel])
  const entry = ROOTS.find(([prefix]) => rel.startsWith(prefix))
  if (!entry) return null
  const [prefix, top] = entry
  try {
    const path = await realpath(join(top, rel.slice(prefix.length)))
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

console.log(`Serving the arrow-use example at http://${HOST}:${server.port}/`)

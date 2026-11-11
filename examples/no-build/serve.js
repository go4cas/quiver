// A small local development server for the no-build example, with an SPA
// fallback: any path under the base that isn't a file gets index.html, so deep
// links work. It serves src/ as is, plus the files the import map needs from the
// two packages in node_modules under vendor/. Nothing is bundled or transformed.
// It listens on 127.0.0.1 only and is not meant for production.
//
//   PORT=3000 QUIVER_BASE=/sub/app/ bun serve.js
import { realpathSync } from 'node:fs'
import { realpath, stat } from 'node:fs/promises'
import { dirname, join, sep } from 'node:path'

const HOST = '127.0.0.1'
const PORT = Number(process.env.PORT ?? 3000)
const BASE = process.env.QUIVER_BASE ?? '/'
// The base goes into <base href>, so only plain path segments: /, /app/, /sub/app/.
if (!/^\/(?:[\w~-][\w.~-]*\/)*$/.test(BASE)) {
  console.error(`QUIVER_BASE must look like / or /sub/app/ (letters, digits, . _ ~ -), got ${JSON.stringify(BASE)}`)
  process.exit(1)
}
const ROOT = import.meta.dir
const html = (await Bun.file(join(ROOT, 'index.html')).text()).replaceAll('%BASE%', BASE)

/** @param {string} name */
const pkg = (name) => dirname(Bun.resolveSync(`${name}/package.json`, ROOT))

// URL prefix → the one folder it may read from: the app's src/, and only the
// folders of the two packages that the import map points into.
/** @type {[string, string][]} */
const ROOTS = [
  ['src/', join(ROOT, 'src')],
  ['vendor/@arrow-js/core/dist/', join(pkg('@arrow-js/core'), 'dist')],
  ['vendor/@go4cas/quiver/src/', join(pkg('@go4cas/quiver'), 'src')],
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
 * The real path of the file for a base-relative path, or null. Symlinks are
 * resolved first, so a link that points out of its root is not served.
 * @param {string} rel '/'-separated, already decoded
 */
async function fileFor(rel) {
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
    const { pathname } = new URL(req.url)
    if (pathname === BASE.slice(0, -1)) return Response.redirect(BASE, 301)
    if (!pathname.startsWith(BASE)) return new Response('Not found', { status: 404 })

    const rel = decode(pathname.slice(BASE.length))
    if (rel === null) return new Response('Bad request', { status: 400 })
    const path = await fileFor(rel)
    if (path) return new Response(Bun.file(path))
    // A missing asset is a 404; anything else is a route for the app.
    if (/\.\w+$/.test(pathname)) return new Response('Not found', { status: 404 })
    return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8' } })
  },
})

console.log(`Serving the no-build example at http://${HOST}:${server.port}${BASE}`)

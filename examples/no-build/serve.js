// A small static server for the no-build example, with an SPA fallback: any
// path under the base that isn't a file gets index.html, so deep links work.
// It serves this folder as is, plus the two packages from node_modules under
// vendor/ for the import map. Nothing is bundled or transformed.
//
//   PORT=3000 QUIVER_BASE=/sub/app/ bun serve.js
import { dirname, join, normalize, sep } from 'node:path'

const PORT = Number(process.env.PORT ?? 3000)
const BASE = process.env.QUIVER_BASE ?? '/'
const ROOT = import.meta.dir
const html = (await Bun.file(join(ROOT, 'index.html')).text()).replaceAll('%BASE%', BASE)

// vendor/<package>/… → that package's folder in node_modules. Only the two in the import map.
/** @type {Record<string, string>} */
const VENDOR = Object.fromEntries(
  ['@arrow-js/core', '@go4cas/quiver'].map((name) => [name, dirname(Bun.resolveSync(`${name}/package.json`, ROOT))]),
)

/** @param {string} rel path relative to the base, already normalised */
function fileFor(rel) {
  if (rel.startsWith('vendor/')) {
    const name = Object.keys(VENDOR).find((n) => rel.startsWith(`vendor/${n}/`))
    return name ? join(VENDOR[name], rel.slice(`vendor/${name}/`.length)) : null
  }
  return rel.startsWith('src/') ? join(ROOT, rel) : null
}

const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const { pathname } = new URL(req.url)
    if (pathname === BASE.slice(0, -1)) return Response.redirect(BASE, 301)
    if (!pathname.startsWith(BASE)) return new Response('Not found', { status: 404 })

    const rel = normalize(decodeURIComponent(pathname.slice(BASE.length))).split(sep).join('/')
    const path = rel.startsWith('..') ? null : fileFor(rel)
    if (path) {
      const file = Bun.file(path)
      if (await file.exists()) return new Response(file)
    }
    // A missing asset is a 404; anything else is a route for the app.
    if (/\.\w+$/.test(pathname)) return new Response('Not found', { status: 404 })
    return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8' } })
  },
})

console.log(`Serving the no-build example at http://localhost:${server.port}${BASE}`)

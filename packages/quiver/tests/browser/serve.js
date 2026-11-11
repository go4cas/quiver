// A static server for the browser fixture: index.html at every path under the
// base (so deep links work), src/ as @go4cas/quiver and @arrow-js/core under
// vendor/. Local only: it listens on 127.0.0.1.
//
//   PORT=5185 QUIVER_BASE=/sub/app/ bun tests/browser/serve.js
import { dirname, join, resolve, sep } from 'node:path'

const PORT = Number(process.env.PORT ?? 5185)
const BASE = process.env.QUIVER_BASE ?? '/'
const HERE = import.meta.dir
const html = (await Bun.file(join(HERE, 'index.html')).text()).replaceAll('%BASE%', BASE)

/** URL prefix → the folder it serves. Nothing else is readable. */
const ROOTS = {
  'vendor/@arrow-js/core/': dirname(Bun.resolveSync('@arrow-js/core/package.json', HERE)),
  'vendor/@go4cas/quiver/': join(HERE, '..', '..', 'src'),
}

/** @param {string} rel @returns {string | null} */
function fileFor(rel) {
  if (rel === 'app.js') return join(HERE, 'app.js')
  for (const [prefix, dir] of Object.entries(ROOTS)) {
    if (!prefix.endsWith('/') || !rel.startsWith(prefix)) continue
    const path = resolve(dir, rel.slice(prefix.length))
    return path.startsWith(dir + sep) ? path : null
  }
  return null
}

const server = Bun.serve({
  hostname: '127.0.0.1',
  port: PORT,
  async fetch(req) {
    const { pathname } = new URL(req.url)
    if (!pathname.startsWith(BASE)) return new Response('Not found', { status: 404 })
    let rel
    try {
      rel = decodeURIComponent(pathname.slice(BASE.length))
    } catch {
      return new Response('Bad request', { status: 400 })
    }
    const path = fileFor(rel)
    if (path) {
      const file = Bun.file(path)
      if (await file.exists()) return new Response(file)
    }
    if (/\.\w+$/.test(pathname)) return new Response('Not found', { status: 404 })
    return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8' } })
  },
})

console.log(`Serving the core browser fixture at http://127.0.0.1:${server.port}${BASE}`)

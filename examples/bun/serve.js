// A small static server for dist/ with an SPA fallback: any path under the base
// that isn't a file gets index.html, so deep links work. Use any static host
// with the same fallback in production.
//
//   PORT=3000 QUIVER_BASE=/sub/app/ bun serve.js
import { join, normalize } from 'node:path'

const PORT = Number(process.env.PORT ?? 3000)
const BASE = process.env.QUIVER_BASE ?? '/'
const DIST = join(import.meta.dir, 'dist')
const html = (await Bun.file(join(import.meta.dir, 'index.html')).text()).replaceAll('%BASE%', BASE)

const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const { pathname } = new URL(req.url)
    if (pathname === BASE.slice(0, -1)) return Response.redirect(BASE, 301)
    if (!pathname.startsWith(BASE)) return new Response('Not found', { status: 404 })

    const rel = normalize(decodeURIComponent(pathname.slice(BASE.length)))
    if (rel && !rel.startsWith('..')) {
      const file = Bun.file(join(DIST, rel))
      if (await file.exists()) return new Response(file)
    }
    // A missing asset is a 404; anything else is a route for the app.
    if (/\.\w+$/.test(pathname)) return new Response('Not found', { status: 404 })
    return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8' } })
  },
})

console.log(`Serving dist/ at http://localhost:${server.port}${BASE}`)

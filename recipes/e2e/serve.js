// Serves e2e/plain-app/ unbundled, with each recipe at quiver/<name>/ (where an
// app that installed it keeps it; recipe tests are not served) and
// @arrow-js/core under vendor/ for the import map. Nothing from @go4cas/quiver.
//
//   PORT=5184 bun e2e/serve.js
import { dirname, join, normalize, sep } from 'node:path'

const PORT = Number(process.env.PORT ?? 5184)
const RECIPES = join(import.meta.dir, '..')
const APP = join(import.meta.dir, 'plain-app')
const ARROW = dirname(Bun.resolveSync('@arrow-js/core/package.json', RECIPES))

/** @param {string} rel path relative to the site root, already normalised */
function fileFor(rel) {
  if (rel === '' || rel === 'index.html') return join(APP, 'index.html')
  if (rel === 'main.js') return join(APP, 'main.js')
  if (rel.startsWith('vendor/@arrow-js/core/')) return join(ARROW, rel.slice('vendor/@arrow-js/core/'.length))
  const m = /^quiver\/([^/]+)\/(.+)$/.exec(rel)
  if (m && !m[2].split('/').includes('tests')) return join(RECIPES, m[1], m[2])
  return null
}

const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const rel = normalize(decodeURIComponent(new URL(req.url).pathname.slice(1))).split(sep).join('/')
    const path = rel.startsWith('..') ? null : fileFor(rel === '.' ? '' : rel)
    const file = path ? Bun.file(path) : null
    return file && (await file.exists()) ? new Response(file) : new Response('Not found', { status: 404 })
  },
})

console.log(`Serving the plain Arrow app at http://localhost:${server.port}/`)

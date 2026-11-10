// A small static server for the vanilla Arrow example. It serves this folder,
// plus @arrow-js/core and this package under vendor/ for the import map.
// Nothing is bundled or transformed.
//
//   PORT=3000 bun example/serve.js
import { dirname, join, normalize, sep } from 'node:path'

const PORT = Number(process.env.PORT ?? 3000)
const ROOT = import.meta.dir

// vendor/<package>/… → that package's folder. Only the two in the import map.
/** @type {Record<string, string>} */
const VENDOR = {
  '@arrow-js/core': dirname(Bun.resolveSync('@arrow-js/core/package.json', ROOT)),
  'arrow-use': join(ROOT, '..'),
}

/** @param {string} rel path relative to the site root, already normalised */
function fileFor(rel) {
  if (rel === '') return join(ROOT, 'index.html')
  if (rel.startsWith('vendor/')) {
    const name = Object.keys(VENDOR).find((n) => rel.startsWith(`vendor/${n}/`))
    return name ? join(VENDOR[name], rel.slice(`vendor/${name}/`.length)) : null
  }
  return rel.startsWith('src/') || rel === 'data.json' ? join(ROOT, rel) : null
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

console.log(`Serving the arrow-use example at http://localhost:${server.port}/`)

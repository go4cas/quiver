// Run with `bun bun-build.js <pages dir> <out dir>` by tests/bun.test.js (S-21).
// Builds bun-entry.js with the Quiver Bun plugin and splitting on, then imports
// the output and calls every loader. Prints a JSON report on stdout.
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import quiver from '../../src/node/bun.js'

const [dir, outdir] = process.argv.slice(2)
const result = await Bun.build({
  entrypoints: [join(import.meta.dir, 'bun-entry.js')],
  outdir,
  splitting: true,
  plugins: [quiver({ dir })],
})
if (!result.success) {
  console.error(result.logs.map(String).join('\n'))
  process.exit(1)
}

const entry = result.outputs.find((o) => o.kind === 'entry-point')
const { routes, notFound } = await import(pathToFileURL(entry.path).href)
const pages = {}
for (const [pattern, load] of Object.entries(routes)) pages[pattern] = (await load()).default()
console.log(JSON.stringify({
  kinds: result.outputs.map((o) => o.kind).sort(),
  pages,
  notFound: notFound ? (await notFound()).default() : null,
}))

// prepack (TECH-SPEC X-3, X-10): adds the generated files to the package folder
// before `npm pack` / `npm publish`. The runtime files are the untouched source.
//
// - recipes/: copied from the repo's recipes/ workspace, because npm `files`
//   can't reach outside the package folder (N24). Each recipe's tests/, and the
//   workspace's own package.json, jsconfig.json, vitest and Playwright configs
//   and e2e/ fixture, stay behind. Recipes are not in `exports` (D32).
// - types/: .d.ts files emitted from the JSDoc by `tsc -p jsconfig.types.json`
//   (X-11, D20), for src/ and src/node/, so `.`, `./vite` and `./bun` all have
//   types.
//
// postpack.js removes both. Both paths are git-ignored.
import { execFileSync } from 'node:child_process'
import { cpSync, existsSync, readFileSync, rmSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join } from 'node:path'

const PKG = join(import.meta.dirname, '..')

// tsc's own output goes to stderr too, so `npm pack --json` stays parseable (N109).
rmSync(join(PKG, 'types'), { recursive: true, force: true })
const tsc = join(createRequire(import.meta.url).resolve('typescript/package.json'), '..', 'bin', 'tsc')
execFileSync(process.execPath, [tsc, '-p', 'jsconfig.types.json'], { cwd: PKG, stdio: ['ignore', 2, 2] })
for (const entry of ['index.d.ts', 'node/vite.d.ts', 'node/bun.d.ts']) {
  if (!existsSync(join(PKG, 'types', entry))) throw new Error(`prepack: tsc did not emit types/${entry}`)
}
console.error('prepack: emitted .d.ts files into types/')
const SOURCE = join(PKG, '..', '..', 'recipes')
const DEST = join(PKG, 'recipes')

if (!existsSync(join(SOURCE, 'index.json'))) {
  throw new Error(`prepack: no recipe registry at ${SOURCE}/index.json`)
}

/** @type {Record<string, unknown>} */
const index = JSON.parse(readFileSync(join(SOURCE, 'index.json'), 'utf8'))

rmSync(DEST, { recursive: true, force: true })
for (const file of ['index.json', 'README.md']) cpSync(join(SOURCE, file), join(DEST, file))
for (const name of Object.keys(index)) {
  cpSync(join(SOURCE, name), join(DEST, name), {
    recursive: true,
    filter: (src) => !src.split(/[\\/]/).includes('tests'),
  })
}
// stderr, so `npm pack --json` output stays parseable.
console.error(`prepack: copied ${Object.keys(index).length} recipes into recipes/`)

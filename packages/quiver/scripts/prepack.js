// prepack (TECH-SPEC X-3, X-10): adds the generated files to the package folder
// before `npm pack` / `npm publish`. The runtime files are the untouched source.
//
// - recipes/: copied from the repo's recipes/ workspace, because npm `files`
//   can't reach outside the package folder (N24). Each recipe's tests/, and the
//   workspace's own package.json, jsconfig.json, vitest and Playwright configs
//   and e2e/ fixture, stay behind. Recipes are not in `exports` (D32).
// - types/: the .d.ts emit (X-11) is added in P8.
//
// postpack.js removes both. Both paths are git-ignored.
import { cpSync, existsSync, readFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'

const PKG = join(import.meta.dirname, '..')
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

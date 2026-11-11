// prepack (TECH-SPEC X-3, X-10): adds the generated files to the package folder
// before `npm pack` / `npm publish`. The runtime files are the untouched source.
//
// - recipes/: copied from the repo's recipes/ workspace, because npm `files`
//   can't reach outside the package folder (N24): index.json, README.md, and for
//   each recipe exactly the paths in its registry `files` plus its README.md
//   (N143), with the same copy the starter sync uses (scripts/copy-recipes.js).
//   Tests, the workspace's configs and e2e/ fixture stay behind. Recipes are not
//   in `exports` (D32).
// - types/: .d.ts files emitted from the JSDoc by `tsc -p jsconfig.types.json`
//   (X-11, D20), for src/ and src/node/, so `.`, `./vite` and `./bun` all have
//   types.
//
// postpack.js removes both. Both paths are git-ignored.
import { execFileSync } from 'node:child_process'
import { cpSync, existsSync, rmSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join } from 'node:path'
import { copyRecipes } from '../../../scripts/copy-recipes.js'

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

const names = copyRecipes(SOURCE, DEST, { readmes: true })
for (const file of ['index.json', 'README.md']) cpSync(join(SOURCE, file), join(DEST, file))
// stderr, so `npm pack --json` output stays parseable.
console.error(`prepack: copied ${names.length} recipes into recipes/`)

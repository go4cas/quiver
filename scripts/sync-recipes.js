// Copies every recipe into starter/src/quiver/<name>/, the way /add-* installs
// them into an app: the paths in each recipe's `files` (index.json), so no
// tests/ and no README.md. The starter must hold exact copies;
// tests/repo/recipes-sync.test.js checks it. Run after editing a recipe:
//
//   bun run recipes:sync
import { cpSync, readFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = join(import.meta.dirname, '..')
const RECIPES = join(ROOT, 'recipes')
const DEST = join(ROOT, 'starter', 'src', 'quiver')

/** @type {Record<string, { files: string[] }>} */
const index = JSON.parse(readFileSync(join(RECIPES, 'index.json'), 'utf8'))

rmSync(DEST, { recursive: true, force: true })
for (const [name, { files }] of Object.entries(index)) {
  for (const file of files) cpSync(join(RECIPES, name, file), join(DEST, name, file), { recursive: true })
}
console.log(`Copied ${Object.keys(index).length} recipes to starter/src/quiver/`)

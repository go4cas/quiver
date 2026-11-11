// Copies every recipe into starter/src/quiver/<name>/, the way /add-* installs
// them into an app: the paths in each recipe's `files` (index.json), so no
// tests/ and no README.md. The starter must hold exact copies;
// tests/repo/recipes-sync.test.js checks it. Run after editing a recipe:
//
//   bun run recipes:sync
import { join } from 'node:path'
import { copyRecipes } from './copy-recipes.js'

const ROOT = join(import.meta.dirname, '..')
const names = copyRecipes(join(ROOT, 'recipes'), join(ROOT, 'starter', 'src', 'quiver'))
console.log(`Copied ${names.length} recipes to starter/src/quiver/`)

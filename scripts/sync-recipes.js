// Installs every recipe into starter/src/ by role, the way /add-* installs them
// into an app (D44): each path in a recipe's `files` (index.json) goes to the
// folder it maps to, with imports between recipes rewritten; no tests/ and no
// README.md. tests/repo/recipes-sync.test.js checks the starter holds exactly
// that. Run after editing a recipe:
//
//   bun run recipes:sync
import { join } from 'node:path'
import { installRecipes } from './copy-recipes.js'

const ROOT = join(import.meta.dirname, '..')
const written = installRecipes(join(ROOT, 'recipes'), join(ROOT, 'starter', 'src'))
console.log(`Installed ${written.length} recipe files into starter/src/`)

// The starter uses the recipes exactly as /add-* installs them (SPEC P7, D44):
// each path in a recipe's `files` (recipes/index.json) is in starter/src/ at the
// path it maps to, byte for byte as installRecipes() writes it (imports between
// recipes rewritten), and there is no src/quiver/ any more. After editing a
// recipe, run `bun run recipes:sync`.
import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { installedContent, installedFiles, readIndex } from '../../scripts/copy-recipes.js'

const ROOT = join(import.meta.dirname, '..', '..')
const RECIPES = join(ROOT, 'recipes')
const SRC = join(ROOT, 'starter', 'src')
const index = readIndex(RECIPES)

describe('starter/src holds the recipes installed by role', () => {
  it('has no recipes folder and no layouts map (D44)', () => {
    expect(existsSync(join(SRC, 'quiver'))).toBe(false)
    expect(existsSync(join(SRC, 'layouts', 'index.js'))).toBe(false)
  })

  it.each(Object.keys(index))('%s is installed exactly', (name) => {
    for (const [from, to] of installedFiles(RECIPES, index, name)) {
      expect(existsSync(join(SRC, to)), to).toBe(true)
      expect(readFileSync(join(SRC, to)).equals(installedContent(RECIPES, index, name, from)), to).toBe(true)
    }
  })

  it('rewrites imports between recipes to the installed places', () => {
    const menu = readFileSync(join(SRC, 'layouts', 'menu.js'), 'utf8')
    expect(menu).toContain(`from '../components/link.js'`)
    expect(menu).not.toMatch(/from '\.\.\/(link|toasts|theme-switcher)\//)
  })
})

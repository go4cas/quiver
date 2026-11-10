// The starter uses the recipes exactly as /add-* installs them: starter/src/quiver/
// holds a byte-identical copy of the `files` of every recipe in recipes/index.json
// (no tests/, no README.md; SPEC P7). After editing a recipe, run `bun run recipes:sync`.
import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = join(import.meta.dirname, '..', '..')
const RECIPES = join(ROOT, 'recipes')
const COPY = join(ROOT, 'starter', 'src', 'quiver')

/** @param {string} dir @returns {string[]} */
function files(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    if (e.isDirectory()) return e.name === 'tests' ? [] : files(join(dir, e.name)).map((f) => `${e.name}/${f}`)
    return [e.name]
  })
}

/** @type {Record<string, { files: string[] }>} */
const index = JSON.parse(readFileSync(join(RECIPES, 'index.json'), 'utf8'))
const names = Object.keys(index)
/** @param {string} name the recipe's files, folders expanded */
const shipped = (name) =>
  index[name].files.flatMap((f) => (f.endsWith('/') ? files(join(RECIPES, name, f)).map((x) => f + x) : [f]))

describe('starter/src/quiver matches recipes/', () => {
  it('holds exactly the recipes in index.json', () => {
    expect(readdirSync(COPY).sort()).toEqual([...names].sort())
  })

  it.each(names)('%s is an exact copy', (name) => {
    const expected = shipped(name).sort()
    expect(files(join(COPY, name)).sort()).toEqual(expected)
    for (const f of expected) {
      expect(readFileSync(join(COPY, name, f)).equals(readFileSync(join(RECIPES, name, f))), f).toBe(true)
    }
  })
})

// The recipe registry (SPEC P7, D32, DESIGN §6.1): index.json lists every recipe
// folder, each recipe has its files and a README, its imports stay inside what
// index.json declares, and every stylesheet starts with the layer statement.
import { describe, it, expect } from 'vitest'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = join(import.meta.dirname, '..')
/** @type {Record<string, { description: string, kind: string, files: Record<string, string>, css: string[], requires: string[], packages: string[], aliases: string[] }>} */
const INDEX = JSON.parse(readFileSync(join(ROOT, 'index.json'), 'utf8'))
const NAMES = Object.keys(INDEX)
const NOT_RECIPES = new Set(['node_modules', 'tests', 'e2e', 'test-results', 'playwright-report'])
const LAYERS = '@layer quiver.tokens, quiver.base, quiver.components, quiver.effects;'
// Where each kind installs in an app's src/ (D44).
/** @type {Record<string, string>} */
const ROLE = { styles: 'styles/', component: 'components/', composable: 'composables/', layout: 'layouts/', view: 'views/' }
const SPECIFIER = /(?:\bfrom\s*|\bimport\s*\(?\s*)(['"])([^'"]+)\1/g

/** @param {string} dir @returns {string[]} paths relative to dir, tests/ excluded */
function filesIn(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    if (e.isDirectory()) return e.name === 'tests' ? [] : filesIn(join(dir, e.name)).map((f) => `${e.name}/${f}`)
    return [e.name]
  })
}

describe('recipe registry', () => {
  it('index.json lists exactly the recipe folders', () => {
    const dirs = readdirSync(ROOT, { withFileTypes: true })
      .filter((e) => e.isDirectory() && !NOT_RECIPES.has(e.name))
      .map((e) => e.name)
    expect(NAMES.sort()).toEqual(dirs.sort())
  })

  it('no two recipe files install to the same path', () => {
    const all = NAMES.flatMap((n) => Object.values(INDEX[n].files))
    expect(new Set(all).size).toBe(all.length)
  })

  it('aliases are unique across recipes, so /add-* resolves one recipe per name', () => {
    const all = NAMES.flatMap((n) => [n, ...INDEX[n].aliases].map((a) => a.toLowerCase()))
    expect(new Set(all).size).toBe(all.length)
  })

  describe.each(NAMES)('%s', (name) => {
    const recipe = INDEX[name]
    const dir = join(ROOT, name)

    it('has a README with Install and Use sections', () => {
      const readme = readFileSync(join(dir, 'README.md'), 'utf8')
      expect(readme).toMatch(/^## Install$/m)
      expect(readme).toMatch(/^## Use$/m)
    })

    it('lists exactly the files it ships (plus README.md)', () => {
      const sources = Object.keys(recipe.files)
      const listed = sources.flatMap((f) =>
        f.endsWith('/') ? readdirSync(join(dir, f)).map((x) => f + x) : [f],
      )
      for (const f of sources) expect(existsSync(join(dir, f)), f).toBe(true)
      expect(filesIn(dir).sort()).toEqual([...listed, 'README.md'].sort())
      for (const css of recipe.css) expect(sources).toContain(css)
    })

    it('installs into the folder of its kind, keeping each file name (D44)', () => {
      expect(Object.keys(ROLE)).toContain(recipe.kind)
      for (const [from, to] of Object.entries(recipe.files)) {
        expect(to, from).toBe(ROLE[recipe.kind] + from)
      }
      if (recipe.kind === 'styles') expect(Object.keys(recipe.files).some((f) => f.endsWith('.js'))).toBe(false)
    })

    it.skipIf(recipe.kind !== 'layout' && recipe.kind !== 'view')('each layout or view file default-exports it, for quiver:app (S-51, S-54)', () => {
      for (const f of Object.keys(recipe.files).filter((x) => x.endsWith('.js'))) {
        expect(readFileSync(join(dir, f), 'utf8'), f).toMatch(/^export default function /m)
      }
    })

    it('imports only the packages and recipes index.json declares', () => {
      const specs = Object.keys(recipe.files)
        .filter((f) => f.endsWith('.js'))
        .flatMap((f) => [...readFileSync(join(dir, f), 'utf8').matchAll(SPECIFIER)].map((m) => m[2]))
      const packages = [...new Set(specs.filter((s) => !s.startsWith('.')))].sort()
      expect(packages).toEqual([...recipe.packages].sort())
      for (const s of specs.filter((x) => x.startsWith('.'))) {
        const m = /^\.\.\/([^/]+)\/([^/]+\.js)$/.exec(s)
        expect(m, `${s} must be ../<recipe>/<file>.js`).not.toBeNull()
        const [, other, file] = /** @type {RegExpExecArray} */ (m)
        expect(recipe.requires, `${name} imports ${s}`).toContain(other)
        expect(Object.keys(INDEX[other]?.files ?? {}), `${s} is not in ${other}'s files`).toContain(file)
      }
    })

    it('requires only known recipes', () => {
      for (const r of recipe.requires) expect(NAMES).toContain(r)
    })

    it.skipIf(!recipe.css.length)('every stylesheet declares the layer order first (DESIGN §3.1)', () => {
      for (const css of recipe.css) {
        const code = readFileSync(join(dir, css), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').trim()
        expect(code.startsWith(LAYERS), css).toBe(true)
      }
    })
  })

  it('font files referenced by the theme exist', () => {
    const css = readFileSync(join(ROOT, 'theme', 'effects.css'), 'utf8')
    const urls = [...css.matchAll(/url\('\.\/([^']+)'\)/g)].map((m) => m[1])
    expect(urls.length).toBeGreaterThan(0)
    for (const u of urls) expect(statSync(join(ROOT, 'theme', u)).isFile()).toBe(true)
  })
})

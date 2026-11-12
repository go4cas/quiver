// File names follow the folder they live in (D45, NOTES N200), Nuxt-style:
// components/ PascalCase, composables/ and state/ camelCase, and pages/,
// layouts/, views/, middleware/ lower-case or kebab-case, since there the file
// name is the route or the layout name. Checked in the starter and in where
// each recipe file installs (recipes/index.json `files`).
import { describe, it, expect } from 'vitest'
import { existsSync, readdirSync } from 'node:fs'
import { join, relative } from 'node:path'
import { readIndex } from '../../scripts/copy-recipes.js'

const ROOT = join(import.meta.dirname, '..', '..')
const SRC = join(ROOT, 'starter', 'src')

/** @type {Record<string, RegExp>} */
const RULES = {
  components: /^[A-Z][A-Za-z0-9]*\.(js|css)$/,
  composables: /^[a-z][A-Za-z0-9]*\.js$/,
  state: /^[a-z][A-Za-z0-9]*State\.js$/,
  layouts: /^[a-z0-9][a-z0-9-]*\.(js|css)$/,
  views: /^[a-z0-9][a-z0-9-]*\.(js|css)$/,
  middleware: /^[a-z0-9][a-z0-9.-]*\.js$/,
  // A page segment is lower-case or kebab-case, a [param] or an _-prefixed part.
  pages: /^(\[[A-Za-z][A-Za-z0-9]*\]|_?[a-z0-9][a-z0-9-]*)(\.js)?$/,
}

/**
 * @param {string} dir
 * @returns {string[]} paths relative to dir, every file and folder
 */
function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? [e.name, ...walk(join(dir, e.name)).map((f) => `${e.name}/${f}`)] : [e.name],
  )
}

describe('file names follow their folder (D45)', () => {
  it.each(Object.keys(RULES).filter((f) => f !== 'pages'))('starter/src/%s', (folder) => {
    const dir = join(SRC, folder)
    if (!existsSync(dir)) return
    for (const name of readdirSync(dir)) expect(name, `${folder}/${name}`).toMatch(RULES[folder])
  })

  it('starter/src/pages', () => {
    for (const path of walk(join(SRC, 'pages'))) {
      for (const segment of path.split('/')) expect(segment, path).toMatch(RULES.pages)
    }
  })

  it('every recipe file installs under a name that fits its folder', () => {
    const index = readIndex(join(ROOT, 'recipes'))
    for (const recipe of Object.values(index)) {
      for (const to of Object.values(recipe.files)) {
        const [folder, name] = to.split('/')
        if (!(folder in RULES) || !name) continue
        expect(name, to).toMatch(RULES[folder])
      }
    }
  })

  it('a component and its stylesheet share a name', () => {
    const dir = join(SRC, 'components')
    for (const css of readdirSync(dir).filter((f) => f.endsWith('.css'))) {
      expect(existsSync(join(dir, css.replace(/\.css$/, '.js'))), relative(SRC, join(dir, css))).toBe(true)
    }
  })
})

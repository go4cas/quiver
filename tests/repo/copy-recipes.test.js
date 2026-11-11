// Audit R15 (N143): the starter sync and the core tarball copy recipes the same
// way, from the registry's `files`, so an unlisted file inside a recipe folder
// reaches neither. recipes/tests/registry.test.js separately fails on such a file.
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { copyRecipes } from '../../scripts/copy-recipes.js'

/** @param {string} dir @returns {string[]} */
const walk = (dir) =>
  readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((e) => e.isFile())
    .map((e) => join(e.parentPath, e.name).slice(dir.length + 1).split('\\').join('/'))
    .sort()

describe('copyRecipes (R15)', () => {
  /** @type {string} */
  let tmp
  /** @type {string} */
  let source

  beforeAll(() => {
    tmp = mkdtempSync(join(tmpdir(), 'quiver-recipes-'))
    source = join(tmp, 'recipes')
    const files = {
      'index.json': JSON.stringify({ widget: { files: ['widget.js', 'assets/'] } }),
      'README.md': '# recipes',
      'widget/widget.js': 'export {}',
      'widget/README.md': '# widget',
      'widget/assets/a.svg': '<svg/>',
      'widget/notes.local.md': 'unlisted',
      'widget/tests/widget.test.js': 'test',
    }
    for (const [path, body] of Object.entries(files)) {
      mkdirSync(join(source, path, '..'), { recursive: true })
      writeFileSync(join(source, path), body)
    }
  })
  afterAll(() => rmSync(tmp, { recursive: true, force: true }))

  it('copies only the listed files for the starter', () => {
    const dest = join(tmp, 'starter')
    expect(copyRecipes(source, dest)).toEqual(['widget'])
    expect(walk(dest)).toEqual(['widget/assets/a.svg', 'widget/widget.js'])
  })

  it('adds only each README.md for the tarball', () => {
    const dest = join(tmp, 'pkg')
    copyRecipes(source, dest, { readmes: true })
    expect(walk(dest)).toEqual(['widget/README.md', 'widget/assets/a.svg', 'widget/widget.js'])
  })

  it('empties the destination first', () => {
    const dest = join(tmp, 'again')
    mkdirSync(join(dest, 'old'), { recursive: true })
    writeFileSync(join(dest, 'old', 'x.js'), '')
    copyRecipes(source, dest)
    expect(walk(dest)).toEqual(['widget/assets/a.svg', 'widget/widget.js'])
  })
})

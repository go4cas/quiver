// Audit R15 (N143): the starter sync and the core tarball copy recipes from the
// registry's `files`, so an unlisted file inside a recipe folder reaches neither.
// recipes/tests/registry.test.js separately fails on such a file. The starter
// gets them installed by role, with imports between recipes rewritten (D44).
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { copyRecipes, installRecipes } from '../../scripts/copy-recipes.js'

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
      'index.json': JSON.stringify({
        widget: { files: { 'widget.js': 'components/widget.js', 'assets/': 'components/assets/' } },
        frame: { files: { 'default.js': 'layouts/default.js' } },
      }),
      'README.md': '# recipes',
      'widget/widget.js': 'export {}',
      'widget/README.md': '# widget',
      'widget/assets/a.svg': '<svg/>',
      'widget/notes.local.md': 'unlisted',
      'widget/tests/widget.test.js': 'test',
      'frame/default.js': "import { Widget } from '../widget/widget.js'\nexport default () => Widget()",
      'frame/README.md': '# frame',
    }
    for (const [path, body] of Object.entries(files)) {
      mkdirSync(join(source, path, '..'), { recursive: true })
      writeFileSync(join(source, path), body)
    }
  })
  afterAll(() => rmSync(tmp, { recursive: true, force: true }))

  it('installs only the listed files, by role, for the starter', () => {
    const dest = join(tmp, 'starter')
    expect(installRecipes(source, dest)).toEqual(['components/widget.js', 'components/assets/a.svg', 'layouts/default.js'])
    expect(walk(dest)).toEqual(['components/assets/a.svg', 'components/widget.js', 'layouts/default.js'])
  })

  it('rewrites imports between recipes to the installed places', () => {
    const dest = join(tmp, 'starter-imports')
    installRecipes(source, dest, ['frame'])
    expect(readFileSync(join(dest, 'layouts/default.js'), 'utf8')).toBe("import { Widget } from '../components/widget.js'\nexport default () => Widget()")
  })

  it('adds only each README.md for the tarball, in the repository layout', () => {
    const dest = join(tmp, 'pkg')
    expect(copyRecipes(source, dest, { readmes: true })).toEqual(['widget', 'frame'])
    expect(walk(dest)).toEqual(['frame/README.md', 'frame/default.js', 'widget/README.md', 'widget/assets/a.svg', 'widget/widget.js'])
    expect(readFileSync(join(dest, 'frame/default.js'), 'utf8')).toContain("'../widget/widget.js'")
  })

  it('empties the tarball destination first', () => {
    const dest = join(tmp, 'again')
    mkdirSync(join(dest, 'old'), { recursive: true })
    writeFileSync(join(dest, 'old', 'x.js'), '')
    copyRecipes(source, dest)
    expect(walk(dest)).toEqual(['frame/default.js', 'widget/assets/a.svg', 'widget/widget.js'])
  })
})

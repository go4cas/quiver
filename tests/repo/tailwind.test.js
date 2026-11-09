// W-12 / SPEC R7: the repo is free of the old CSS framework. A case-insensitive
// grep over the repo may match only the allowed files: the changelog, the
// optional framework guide (P8) and the layer-order note in the theming guide (D29).
import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'

const ROOT = join(import.meta.dirname, '..', '..')
// Split so this file doesn't match itself.
const WORD = new RegExp('tail' + 'wind', 'i')

const SKIP_DIRS = new Set(['.git', 'node_modules', 'planning', 'dist', 'test-results', 'playwright-report', '__screenshots__'])
const SKIP_FILES = new Set(['bun.lock'])
const SKIP_PATHS = ['docs/.vitepress/dist', 'docs/.vitepress/cache']
const BINARY = /\.(png|jpe?g|gif|webp|ico|woff2?|ttf|otf)$/i

const ALLOWED = new Set([
  'CHANGELOG.md',
  'docs/guide/theming.md',   // layer-order note (D29); limited to that one line below
  `docs/guide/${'tail' + 'wind'}.md`,  // optional guide, added in P8
])

/** @param {string} dir @returns {string[]} */
function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    const rel = relative(ROOT, path)
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name) || SKIP_PATHS.includes(rel)) return []
      return walk(path)
    }
    if (SKIP_FILES.has(entry.name) || BINARY.test(entry.name)) return []
    return [rel]
  })
}

describe('R7: old CSS framework is gone', () => {
  it('is named only in CHANGELOG.md, its optional guide and the layer-order note', () => {
    const matches = walk(ROOT).filter((file) => WORD.test(readFileSync(join(ROOT, file), 'utf8')))
    expect(matches.filter((file) => !ALLOWED.has(file))).toEqual([])
  })

  it('names it on one line of the theming guide only: the layer-order note', () => {
    const lines = readFileSync(join(ROOT, 'docs/guide/theming.md'), 'utf8').split('\n').filter((line) => WORD.test(line))
    expect(lines).toHaveLength(1)
    expect(lines[0]).toContain('@layer theme, base, quiver, components, utilities;')
  })
})

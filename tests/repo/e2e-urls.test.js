// TECH-SPEC CI-3: e2e tests navigate with relative URLs. Playwright resolves
// goto('/x') against the origin, which would drop the sub-path project's /sub/app/.
import { describe, it, expect } from 'vitest'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'

const ROOT = join(import.meta.dirname, '..', '..')

/** @param {string} dir @returns {string[]} */
function testFiles(dir) {
  if (!existsSync(dir)) return []
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) return entry.name === 'node_modules' ? [] : testFiles(path)
    return entry.name.endsWith('.js') ? [path] : []
  })
}

const examples = existsSync(join(ROOT, 'examples'))
  ? readdirSync(join(ROOT, 'examples')).map((name) => join(ROOT, 'examples', name, 'tests'))
  : []
const files = [join(ROOT, 'starter/tests/e2e'), join(ROOT, 'packages/arrow-use/example/tests'), ...examples].flatMap(testFiles)

describe('e2e URLs are relative (CI-3)', () => {
  it('finds the starter e2e tests', () => {
    expect(files.length).toBeGreaterThan(0)
  })

  it.each(files.map((f) => [relative(ROOT, f), f]))('%s has no goto(\'/…\')', (_, file) => {
    expect(readFileSync(file, 'utf8')).not.toMatch(/goto\(\s*['"`]\//)
  })
})

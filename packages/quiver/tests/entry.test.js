// TECH-SPEC C-1, C-2, C-4, C-5: the public entry and what browser code may import.
import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const SRC = join(import.meta.dirname, '..', 'src')

/** @returns {string[]} every .js file under src/ except src/node/ */
function browserFiles(dir = SRC) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) return entry.name === 'node' ? [] : browserFiles(path)
    return entry.name.endsWith('.js') ? [path] : []
  })
}

describe('public entry', () => {
  it('C-1/C-2: exports exactly the 13 public names', async () => {
    expect(Object.keys(await import('../src/index.js')).sort()).toEqual([
      'afterEach', 'beforeEach', 'createApp', 'destroy', 'go', 'initRouter', 'inject',
      'onError', 'provide', 'url', 'useMeta', 'useRoute', 'useRouter',
    ])
  })
})

describe('browser source rules', () => {
  const files = browserFiles()
  // Static import/export statements and dynamic import(), in code with comments removed.
  const STATIC = /^\s*(?:(?:import|export)\b[^'"();=]*?\bfrom\s*|import\s*)(['"])([^'"]+)\1/gm
  const DYNAMIC = /\bimport\(\s*(['"])([^'"]+)\1/g
  /** @param {string} source */
  const code = (source) => source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

  it('finds the source files', () => {
    expect(files.length).toBeGreaterThan(5)
  })

  it.each(files.map((f) => [f.slice(SRC.length + 1), f]))('C-4: %s imports only relative paths and @arrow-js/core', (_, file) => {
    const source = code(readFileSync(file, 'utf8'))
    const specs = [...source.matchAll(STATIC), ...source.matchAll(DYNAMIC)].map((m) => m[2])
    for (const spec of specs) {
      expect(spec === '@arrow-js/core' || spec.startsWith('./') || spec.startsWith('../'), spec).toBe(true)
    }
    expect(source).not.toMatch(/import\.meta\./)
  })

  it.each(files.map((f) => [f.slice(SRC.length + 1), f]))('C-5: %s renders no class attribute', (_, file) => {
    expect(readFileSync(file, 'utf8')).not.toMatch(/class=/)
  })
})

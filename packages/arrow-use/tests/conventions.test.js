// TECH-SPEC §8 conventions that can be read off the source: U-2 (public Arrow
// only), U-3 (module top levels are declarations only), U-6 (getters plus
// stop), U-8 (one file per composable, index re-exports exactly those).
import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import * as api from '../src/index.js'

const SRC = join(import.meta.dirname, '..', 'src')
const files = readdirSync(SRC).filter((f) => f.endsWith('.js'))
const source = (/** @type {string} */ f) => readFileSync(join(SRC, f), 'utf8')
const SPECIFIER = /(?:\bfrom\s*|\bimport\s*\(?\s*)(['"])([^'"]+)\1/g

describe('U-2: imports', () => {
  it('imports only relative files or exactly @arrow-js/core', () => {
    const specs = files.flatMap((f) => [...source(f).matchAll(SPECIFIER)].map((m) => `${f}: ${m[2]}`))
    expect(specs.length).toBeGreaterThan(0)
    expect(specs.filter((s) => !/: (\.\/[\w.]+\.js|@arrow-js\/core)$/.test(s))).toEqual([])
  })
})

describe('U-3: nothing runs at import', () => {
  // Strip comments, then every statement that starts in column 0 must be an
  // import, an export, a function, or a const bound to a literal object.
  const TOP_LEVEL_OK = /^(import\s|export (\{|\*|function\s)|function\s|const [A-Z_]+ = \{|\}|$)/

  it.each(files)('%s', (file) => {
    const code = source(file).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
    const bad = code.split('\n').filter((line) => /^\S/.test(line) && !TOP_LEVEL_OK.test(line))
    expect(bad).toEqual([])
  })
})

describe('U-8: one file per composable', () => {
  it('src/use*.js each export the composable of that name, and index.js re-exports exactly those', async () => {
    const composables = files.filter((f) => /^use\w+\.js$/.test(f)).map((f) => f.slice(0, -3))
    expect(Object.keys(api).sort()).toEqual(composables.sort())
    for (const name of composables) {
      const mod = await import(`../src/${name}.js`)
      expect(Object.keys(mod), name).toEqual([name])
      expect(mod[name]).toBe(/** @type {any} */ (api)[name])
    }
  })

  it('has no default exports', () => {
    expect(files.filter((f) => /\bexport\s+default\b/.test(source(f)))).toEqual([])
  })

  it('index.js holds only re-exports', () => {
    const lines = source('index.js').split('\n').filter(Boolean)
    expect(lines.every((l) => /^export \{ use\w+ \} from '\.\/use\w+\.js'$/.test(l))).toBe(true)
  })
})

describe('U-6: getters plus stop', () => {
  const calls = {
    useFetch: () => api.useFetch('/x', { immediate: false }),
    useStorage: () => api.useStorage('k', 0),
    useMediaQuery: () => api.useMediaQuery('(min-width: 1px)'),
    useEventListener: () => api.useEventListener(new EventTarget(), 'x', () => {}),
  }

  it('covers every export', () => {
    expect(Object.keys(calls).sort()).toEqual(Object.keys(api).sort())
  })

  it.each(Object.entries(calls))('%s returns a plain object of functions with stop()', (_name, call) => {
    const result = /** @type {Record<string, unknown>} */ (call())
    expect(Object.getPrototypeOf(result)).toBe(Object.prototype)
    expect(typeof result.stop).toBe('function')
    for (const [key, member] of Object.entries(result)) expect(typeof member, key).toBe('function')
  })
})

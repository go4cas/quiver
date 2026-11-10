// TECH-SPEC W-10 / D34: package boundaries, checked by reading source files.
// - nothing under packages/quiver/ imports from starter/, recipes/ or examples/
// - nothing under packages/arrow-use/ imports @go4cas/quiver or reaches outside the package (P6)
// - nothing under recipes/useForm/ imports @go4cas/quiver (P7)
// Directories that don't exist yet are skipped, so the later phases inherit the checks.
import { describe, it, expect } from 'vitest'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, join, relative, resolve, sep } from 'node:path'

const ROOT = join(import.meta.dirname, '..', '..')
const SKIP_DIRS = new Set(['node_modules', 'types', 'dist', 'test-results', 'playwright-report'])
// Static `import … from '…'`, `export … from '…'`, bare `import '…'` and dynamic `import('…')`.
const SPECIFIER = /(?:\bfrom\s*|\bimport\s*\(?\s*)(['"])([^'"]+)\1/g

/** @param {string} dir @returns {string[]} */
function jsFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) return SKIP_DIRS.has(entry.name) ? [] : jsFiles(path)
    return /\.(m?js|cjs)$/.test(entry.name) ? [path] : []
  })
}

/** @param {string} dir @returns {{ file: string, spec: string }[]} */
function importsIn(dir) {
  return jsFiles(dir).flatMap((file) =>
    [...readFileSync(file, 'utf8').matchAll(SPECIFIER)].map((m) => ({ file: relative(ROOT, file), spec: m[2] })),
  )
}

/** @param {string} file @param {string} spec */
const resolvesTo = (file, spec) => relative(ROOT, resolve(ROOT, dirname(file), spec))

/** @param {string} path @param {string} dir */
const isInside = (path, dir) => path === dir || path.startsWith(dir + sep)

const CORE = 'packages/quiver'
const ARROW_USE = 'packages/arrow-use'
const USE_FORM = 'recipes/useForm'
const APP_DIRS = ['starter', 'recipes', 'examples']
const APP_PACKAGES = ['quiver-starter', 'quiver-recipes', 'quiver-example-vite', 'quiver-example-bun', 'quiver-example-no-build']

describe('W-10: package boundaries', () => {
  it('finds the import statements it checks', () => {
    // Guards against a regex that silently matches nothing.
    expect(importsIn(join(ROOT, CORE)).some(({ spec }) => spec === '@arrow-js/core')).toBe(true)
  })

  it('core imports nothing from the starter, recipes or examples', () => {
    const bad = importsIn(join(ROOT, CORE)).filter(({ file, spec }) =>
      spec.startsWith('.')
        ? APP_DIRS.some((dir) => isInside(resolvesTo(file, spec), dir))
        : APP_PACKAGES.some((name) => spec === name || spec.startsWith(name + '/')),
    )
    expect(bad).toEqual([])
  })

  it.skipIf(!existsSync(join(ROOT, ARROW_USE)))('arrow-use imports neither Quiver nor files outside its package', () => {
    const bad = importsIn(join(ROOT, ARROW_USE)).filter(({ file, spec }) =>
      spec.startsWith('.') ? !isInside(resolvesTo(file, spec), ARROW_USE) : spec.startsWith('@go4cas/quiver'),
    )
    expect(bad).toEqual([])
  })

  it.skipIf(!existsSync(join(ROOT, USE_FORM)))('the useForm recipe does not import Quiver', () => {
    const bad = importsIn(join(ROOT, USE_FORM)).filter(({ spec }) => spec.startsWith('@go4cas/quiver'))
    expect(bad).toEqual([])
  })
})

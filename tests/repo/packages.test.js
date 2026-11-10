// TECH-SPEC W-13: the published packages follow X-1 and X-2 (D20), and arrow-use
// is the 0.1.0 package of §5.2 (D15, U-1).
import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = join(import.meta.dirname, '..', '..')
const PACKAGES = ['packages/quiver', 'packages/arrow-use']
/** @param {string} dir */
const pkgOf = (dir) => JSON.parse(readFileSync(join(ROOT, dir, 'package.json'), 'utf8'))

describe.each(PACKAGES)('%s (X-1, X-2)', (dir) => {
  const pkg = pkgOf(dir)

  it('is an MIT, side-effect-free ES module with a LICENSE file', () => {
    expect(pkg.type).toBe('module')
    expect(pkg.license).toBe('MIT')
    expect(pkg.sideEffects).toBe(false)
    expect(existsSync(join(ROOT, dir, 'LICENSE'))).toBe(true)
    expect(pkg.files).toEqual(expect.arrayContaining(['src', 'types', 'README.md', 'LICENSE']))
  })

  it('resolves only through its exports map, types first, and exports ./package.json', () => {
    for (const field of ['main', 'module', 'browser']) expect(pkg, field).not.toHaveProperty(field)
    expect(pkg.exports['./package.json']).toBe('./package.json')
    for (const [key, target] of Object.entries(pkg.exports)) {
      if (typeof target === 'string') continue
      expect(Object.keys(/** @type {object} */ (target))[0], key).toBe('types')
      if ('default' in target) expect(Object.keys(target), key).toEqual(['types', 'default'])
    }
  })

  it('has @arrow-js/core as its only peer, also as a dev dependency, and no dependencies', () => {
    expect(pkg.peerDependencies).toEqual({ '@arrow-js/core': '^1.0.6' })
    expect(pkg.devDependencies['@arrow-js/core']).toBe('^1.0.6')
    expect(pkg).not.toHaveProperty('dependencies')
  })

  it('ignores the generated types/ folder', () => {
    const ignored = [join(ROOT, '.gitignore'), join(ROOT, dir, '.gitignore')]
      .filter((f) => existsSync(f))
      .flatMap((f) => readFileSync(f, 'utf8').split('\n'))
    expect(ignored.some((line) => ['types/', `${dir}/types/`, 'packages/*/types/'].includes(line.trim()))).toBe(true)
  })
})

describe('arrow-use (§5.2, D15)', () => {
  const pkg = pkgOf('packages/arrow-use')

  it('is arrow-use 0.1.0 with one entry point (X-20)', () => {
    expect(pkg.name).toBe('arrow-use')
    expect(pkg.version).toBe('0.1.0')
    expect(Object.keys(pkg.exports)).toEqual(['.', './package.json'])
    expect(pkg.exports['.']).toEqual({ types: './types/index.d.ts', default: './src/index.js' })
    expect(pkg.files).toEqual(['src', 'types', 'README.md', 'LICENSE'])
  })

  it('generates .d.ts only at prepack and removes them at postpack (X-3)', () => {
    expect(pkg.scripts.prepack).toBe('tsc -p jsconfig.types.json')
    expect(pkg.scripts.postpack).toMatch(/rmSync\('types'/)
  })

  it('typechecks with no ambient types', () => {
    const config = JSON.parse(readFileSync(join(ROOT, 'packages/arrow-use/jsconfig.json'), 'utf8'))
    expect(config.compilerOptions.types).toEqual([])
  })
})

// TECH-SPEC W-13: the published packages follow X-1, X-2 and the engines rules
// (D20: only core, which ships the CLI, sets engines.node), and arrow-use is the
// 0.1.0 package of §5.2 (D15, U-1).
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

describe('engines (D20, §5.1, §5.2)', () => {
  it('core requires Node >=22.12 for the quiver CLI, and nothing else', () => {
    expect(pkgOf('packages/quiver').engines).toEqual({ node: '>=22.12' })
  })

  // R11 (2026-11-11 audit): the workspace and the starter run Vitest with jsdom, whose
  // engines are narrower than the CLI's, so they advertise jsdom's range, not core's.
  it('the workspace root and the starter require the Node their test stack (jsdom) needs', () => {
    const jsdom = JSON.parse(readFileSync(join(ROOT, 'node_modules/jsdom/package.json'), 'utf8'))
    expect(pkgOf('.').engines.node).toBe(jsdom.engines.node)
    expect(pkgOf('starter').engines.node).toBe(jsdom.engines.node)
  })

  it('arrow-use sets no engines: it is browser code with no CLI', () => {
    expect(pkgOf('packages/arrow-use')).not.toHaveProperty('engines')
  })
})

describe('publishConfig (X-1, N120)', () => {
  it('core is scoped, so it publishes as public without --access public', () => {
    expect(pkgOf('packages/quiver').publishConfig).toEqual({ access: 'public' })
  })

  it('arrow-use is unscoped and public by default, so it sets none', () => {
    expect(pkgOf('packages/arrow-use')).not.toHaveProperty('publishConfig')
  })
})

describe('core ships the recipes and the agent docs (SPEC P7, D32, X-10)', () => {
  const pkg = pkgOf('packages/quiver')

  it('lists recipes/, AGENTS.md and llms.txt in files, and both docs exist', () => {
    expect(pkg.files).toEqual(expect.arrayContaining(['recipes', 'AGENTS.md', 'llms.txt']))
    for (const f of ['AGENTS.md', 'llms.txt']) expect(existsSync(join(ROOT, 'packages/quiver', f)), f).toBe(true)
  })

  it('copies recipes/ in at prepack and removes it at postpack, outside git (X-3)', () => {
    expect(pkg.scripts.prepack).toBe('node scripts/prepack.js')
    expect(pkg.scripts.postpack).toBe('node scripts/postpack.js')
    expect(readFileSync(join(ROOT, '.gitignore'), 'utf8').split('\n')).toContain('packages/quiver/recipes/')
    expect(pkg.exports).not.toHaveProperty('./recipes')
  })

  it('has a top-level types field matching exports["."], for moduleResolution node10 (X-1)', () => {
    expect(pkg.types).toBe('./types/index.d.ts')
    expect(pkg.types).toBe(pkg.exports['.'].types)
  })

  it('the starter CLAUDE.md imports both from the installed package', () => {
    const md = readFileSync(join(ROOT, 'starter/CLAUDE.md'), 'utf8')
    expect(md).toContain('@node_modules/@go4cas/quiver/AGENTS.md')
    expect(md).toContain('@node_modules/@go4cas/quiver/llms.txt')
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

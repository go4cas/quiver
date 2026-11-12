// SPEC P5 / TECH-SPEC W-4, CI-1, CI-5: the build-mode examples. Each is meant to be
// copied out of the repo, so it uses real version ranges and imports nothing from
// outside its own folder, and each runs its e2e suite at / and under a base path.
import { describe, it, expect } from 'vitest'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, join, relative, resolve, sep } from 'node:path'

const ROOT = join(import.meta.dirname, '..', '..')
const EXAMPLES = join(ROOT, 'examples')
const NAMES = ['bun', 'no-build', 'vite']
// TECH-SPEC CI-1: [root port, base-path port] per example.
const PORTS = { vite: [5180, 5190], bun: [5181, 5191], 'no-build': [5182, 5192] }
const SPECIFIER = /(?:\bfrom\s*|\bimport\s*\(?\s*)(['"])([^'"]+)\1/g

/** @param {string} dir @returns {string[]} */
function jsFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) return ['node_modules', 'dist', 'test-results'].includes(entry.name) ? [] : jsFiles(path)
    return entry.name.endsWith('.js') ? [path] : []
  })
}

/** @param {string} name @param {string} file */
const read = (name, file) => readFileSync(join(EXAMPLES, name, file), 'utf8')

describe('examples (P5)', () => {
  it('has exactly the three build modes', () => {
    expect(readdirSync(EXAMPLES).sort()).toEqual(NAMES)
  })

  describe.each(NAMES)('examples/%s', (name) => {
    const pkg = JSON.parse(read(name, 'package.json'))

    it('is a private package with real version ranges (W-4)', () => {
      expect(pkg.private).toBe(true)
      // vite and no-build use quiver:app and createApp(app, options), new in 3.2 (N199);
      // bun keeps the manual setup, which works on any 3.x.
      const quiver = name === 'bun' ? '^3.0.0' : '^3.2.1'
      expect(pkg.dependencies).toEqual({ '@arrow-js/core': '^1.0.6', '@go4cas/quiver': quiver })
      const ranges = [pkg.dependencies, pkg.devDependencies].flatMap((deps) => Object.values(deps ?? {}))
      expect(ranges.filter((range) => String(range).startsWith('workspace:'))).toEqual([])
    })

    it('has typecheck and test:e2e scripts, so the root fan-out and CI run it', () => {
      expect(pkg.scripts.typecheck).toBe('tsc -p jsconfig.json')
      expect(pkg.scripts['test:e2e']).toBe('playwright test')
    })

    it('runs e2e at / and under /sub/app/ on its own fixed ports (CI-1, CI-5)', () => {
      const config = read(name, 'playwright.config.js')
      const [rootPort, subPort] = PORTS[/** @type {keyof typeof PORTS} */ (name)]
      expect(config).toContain(`http://localhost:${rootPort}/'`)
      expect(config).toContain(`http://localhost:${subPort}/sub/app/'`)
      expect(config).toContain(`QUIVER_BASE: '/sub/app/'`)
    })

    it('imports nothing from outside its own folder', () => {
      const dir = join(EXAMPLES, name)
      const bad = jsFiles(dir).flatMap((file) =>
        [...readFileSync(file, 'utf8').matchAll(SPECIFIER)]
          .map((m) => m[2])
          .filter((spec) => spec.startsWith('.') && relative(dir, resolve(dirname(file), spec)).startsWith('..' + sep))
          .map((spec) => `${relative(ROOT, file)}: ${spec}`),
      )
      expect(bad).toEqual([])
    })
  })

  it('no-build maps only Quiver and Arrow, both from the server, never a CDN +esm bundle (CI-5)', () => {
    const html = read('no-build', 'index.html')
    const map = JSON.parse(/** @type {RegExpMatchArray} */ (html.match(/<script type="importmap">([\s\S]*?)<\/script>/))[1])
    expect(Object.keys(map)).toEqual(['imports'])
    expect(map.imports).toEqual({
      '@arrow-js/core': './vendor/@arrow-js/core/dist/index.mjs',
      '@go4cas/quiver': './vendor/@go4cas/quiver/src/index.js',
    })
    expect(html).not.toMatch(/\+esm|https?:\/\//)
    expect(existsSync(join(EXAMPLES, 'no-build/tests/e2e/one-arrow.test.js'))).toBe(true)
  })
})

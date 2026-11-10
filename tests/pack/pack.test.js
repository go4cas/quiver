// TECH-SPEC X-4 (SPEC P8 Done-when): `npm pack --dry-run --json` for each published
// package lists exactly the runtime files, one .d.ts per runtime file, LICENSE and
// README.md, and for core AGENTS.md, llms.txt, recipes/**, bin/quiver.js and
// client.d.ts. Every `exports`, `bin` and `files` target is in the tarball.
import { describe, it, expect, beforeAll } from 'vitest'
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = join(import.meta.dirname, '..', '..')

/**
 * @param {string} dir absolute
 * @returns {string[]} POSIX paths of every file under dir, relative to dir
 */
function walk(dir) {
  return readdirSync(dir, { recursive: true, encoding: 'utf8' })
    .filter((f) => statSync(join(dir, f)).isFile())
    .map((f) => f.split('\\').join('/'))
}

/**
 * @param {string} pkgDir repo-relative
 * @returns {string[]} sorted file paths in the tarball
 */
function packFiles(pkgDir) {
  const out = execFileSync('npm', ['pack', '--dry-run', '--json', '--ignore-scripts=false'], {
    cwd: join(ROOT, pkgDir),
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  /** @type {{ files: { path: string }[] }[]} */
  const json = JSON.parse(out)
  return json[0].files.map((f) => f.path).sort()
}

/** @param {unknown} value @returns {string[]} every string leaf */
const leaves = (value) =>
  typeof value === 'string' ? [value] : Object.values(/** @type {object} */ (value ?? {})).flatMap(leaves)

/** @param {string} target './x/y' @returns {string} 'x/y' */
const strip = (target) => target.replace(/^\.\//, '')

/**
 * @param {string} pkgDir
 * @param {string[]} files
 */
function expectTargetsPacked(pkgDir, files) {
  const pkg = JSON.parse(readFileSync(join(ROOT, pkgDir, 'package.json'), 'utf8'))
  for (const target of [...leaves(pkg.exports), ...leaves(pkg.bin)]) {
    expect(files, `${pkgDir}: ${target}`).toContain(strip(target))
  }
  for (const entry of pkg.files) {
    expect(files.some((f) => f === entry || f.startsWith(`${entry}/`)), `${pkgDir}: files entry ${entry}`).toBe(true)
  }
}

describe('@go4cas/quiver tarball (X-4, X-10, X-11)', () => {
  /** @type {string[]} */
  let files
  beforeAll(() => {
    files = packFiles('packages/quiver')
  })

  it('has exactly the source, one .d.ts per source file, the CLI, the docs and the recipes', () => {
    const src = walk(join(ROOT, 'packages/quiver/src')).map((f) => `src/${f}`)
    const types = src.map((f) => f.replace(/^src\//, 'types/').replace(/\.js$/, '.d.ts'))

    /** @type {Record<string, { files: string[] }>} */
    const index = JSON.parse(readFileSync(join(ROOT, 'recipes/index.json'), 'utf8'))
    const recipes = ['recipes/index.json', 'recipes/README.md']
    for (const [name, recipe] of Object.entries(index)) {
      recipes.push(`recipes/${name}/README.md`)
      for (const file of recipe.files) {
        const from = join(ROOT, 'recipes', name, file)
        if (file.endsWith('/')) recipes.push(...walk(from).map((f) => `recipes/${name}/${file}${f}`))
        else recipes.push(`recipes/${name}/${file}`)
      }
    }

    const expected = [
      ...src,
      ...types,
      ...recipes,
      'AGENTS.md',
      'LICENSE',
      'README.md',
      'bin/quiver.js',
      'client.d.ts',
      'llms.txt',
      'package.json',
    ].sort()
    expect(files).toEqual(expected)
  })

  it('ships no tests, scripts or configs', () => {
    expect(files.filter((f) => /(^|\/)(tests|scripts|e2e)\/|jsconfig|vitest|playwright/.test(f))).toEqual([])
  })

  it('packs every exports, bin and files target', () => expectTargetsPacked('packages/quiver', files))

  it('leaves the package folder clean (postpack, X-3)', () => {
    for (const dir of ['types', 'recipes']) expect(existsSync(join(ROOT, 'packages/quiver', dir)), dir).toBe(false)
  })
})

describe('arrow-use tarball (X-4, §5.2)', () => {
  /** @type {string[]} */
  let files
  beforeAll(() => {
    files = packFiles('packages/arrow-use')
  })

  it('has exactly the source, one .d.ts per source file, LICENSE and README.md', () => {
    const src = walk(join(ROOT, 'packages/arrow-use/src')).map((f) => `src/${f}`)
    const types = src.map((f) => f.replace(/^src\//, 'types/').replace(/\.js$/, '.d.ts'))
    expect(files).toEqual([...src, ...types, 'LICENSE', 'README.md', 'package.json'].sort())
  })

  it('packs every exports and files target', () => expectTargetsPacked('packages/arrow-use', files))

  it('leaves the package folder clean (postpack, X-3)', () => {
    expect(existsSync(join(ROOT, 'packages/arrow-use/types'))).toBe(false)
  })
})


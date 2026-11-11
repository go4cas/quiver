// @vitest-environment node
// TECH-SPEC §4.1–4.2, S-1…S-8: the route scanner behind all three front-ends.
import { describe, it, expect } from 'vitest'
import { mkdirSync, mkdtempSync, readdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileToRoutePath, generateManifest, scanPages } from '../src/node/scanner.js'

const FIXTURES = join(import.meta.dirname, 'fixtures')
const PAGES = join(FIXTURES, 'pages')
/** @param {string} name */
const broken = (name) => join(FIXTURES, 'broken', name)

describe('fileToRoutePath (S-2, 2.x semantics)', () => {
  it.each([
    ['index.js', '/'],
    ['about.js', '/about'],
    ['users/index.js', '/users'],
    ['users/[id].js', '/users/:id'],
    ['blog/[slug]/comments.js', '/blog/:slug/comments'],
    ['a/[b]/[c].js', '/a/:b/:c'],
    ['indexes.js', '/indexes'],
    ['release notes.js', '/release notes'],
    ['caf\u00e9.js', '/caf\u00e9'],
    ['cafe\u0301.js', '/caf\u00e9'],
  ])('%s → %s', (file, pattern) => {
    expect(fileToRoutePath(file)).toBe(pattern)
  })
})

describe('scanPages', () => {
  it('S-1/S-3/S-6: finds every page, skips . and _ entries and non-.js files, sorts by pattern', async () => {
    expect(await scanPages(PAGES)).toEqual({
      routes: [
        { pattern: '/', file: 'index.js' },
        { pattern: '/about', file: 'about.js' },
        { pattern: '/blog/:slug/comments', file: 'blog/[slug]/comments.js' },
        { pattern: '/café', file: 'café.js' },
        { pattern: '/release notes', file: 'release notes.js' },
        { pattern: '/users', file: 'users/index.js' },
        { pattern: '/users/:id', file: 'users/[id].js' },
      ],
      notFound: 'not-found.js',
    })
  })

  it('S-3: notFound is null without a root not-found.js', async () => {
    expect((await scanPages(broken('duplicate/users'))).notFound).toBeNull()
  })

  it('S-3: rejects a nested not-found.js', async () => {
    await expect(scanPages(broken('nested-not-found'))).rejects.toThrow(
      '[quiver] Nested not-found.js is not supported: users/not-found.js',
    )
  })

  it('S-4: rejects two files with the same pattern, naming both', async () => {
    await expect(scanPages(broken('duplicate'))).rejects.toThrow(
      '[quiver] users.js and users/index.js both map to "/users".',
    )
  })

  it('S-4: rejects two files that differ only in parameter names, naming both', async () => {
    await expect(scanPages(broken('param-names'))).rejects.toThrow(
      /^\[quiver\] u\/\[id\]\.js and u\/\[slug\]\.js differ only in parameter names/,
    )
  })

  it('S-5/S-7: rejects invalid patterns, naming each file, all errors at once', async () => {
    const error = await scanPages(broken('bad-pattern')).catch((e) => e)
    expect(error).toBeInstanceOf(Error)
    expect(error.message.split('\n')).toEqual([
      '[quiver] Route "/:1st" from [1st].js has an invalid parameter name ":1st".',
      '[quiver] Route "/:id/:id" from [id]/[id].js repeats the parameter ":id".',
    ])
  })

  it('N135: rejects "%" and "\\" in names, naming the file', async () => {
    await expect(scanPages(broken('percent'))).rejects.toThrow(
      '[quiver] Route "/100%" from 100%.js contains "%"; name the file with the characters themselves (a space, é), not percent-escapes.',
    )
    const dir = mkdtempSync(join(tmpdir(), 'quiver-scan-'))
    writeFileSync(join(dir, 'a\\b.js'), '')
    await expect(scanPages(dir)).rejects.toThrow('[quiver] Route "/a\\b" from a\\b.js contains "\\", which a browser turns into "/".')
  })

  it('N135: a decomposed (NFD) name gives an NFC pattern and keeps the name on disk for the import', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'quiver-scan-'))
    mkdirSync(join(dir, 'cafe\u0301'))
    writeFileSync(join(dir, 'cafe\u0301', 'menu.js'), '')
    const { routes } = await scanPages(dir)
    const { file } = routes[0]
    expect(routes).toEqual([{ pattern: '/caf\u00e9/menu', file }])
    expect(file).toBe(`${readdirSync(dir)[0]}/menu.js`)
    expect(generateManifest({ routes, notFound: null }, (f) => `./${f}`)).toContain(`'/caf\u00e9/menu': () => import('./${file}')`)
  })

  it('N135: NFC and NFD spellings of one name are one route', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'quiver-scan-'))
    writeFileSync(join(dir, 'caf\u00e9.js'), '')
    writeFileSync(join(dir, 'cafe\u0301.js'), '')
    // A normalisation-insensitive file system (APFS, NTFS) keeps only one file.
    if (readdirSync(dir).length < 2) return
    await expect(scanPages(dir)).rejects.toThrow(/both map to "\/caf\u00e9"/)
  })

  it('rejects a missing directory', async () => {
    await expect(scanPages(join(FIXTURES, 'nope'))).rejects.toThrow(/^\[quiver\] Pages directory not found: /)
  })
})

describe('generateManifest (S-8)', () => {
  it('emits the exact module source', () => {
    const source = generateManifest(
      { routes: [{ pattern: '/', file: 'index.js' }, { pattern: '/users/:id', file: 'users/[id].js' }], notFound: 'not-found.js' },
      (file) => `./pages/${file}`,
    )
    expect(source).toBe(
      "// Generated by Quiver. Do not edit.\n" +
      "export default {\n" +
      "  '/': () => import('./pages/index.js'),\n" +
      "  '/users/:id': () => import('./pages/users/[id].js'),\n" +
      "}\n" +
      "export const notFound = () => import('./pages/not-found.js')\n",
    )
  })

  it('exports notFound as undefined without a not-found page', () => {
    expect(generateManifest({ routes: [], notFound: null }, (f) => f)).toBe(
      '// Generated by Quiver. Do not edit.\nexport default {\n}\nexport const notFound = undefined\n',
    )
  })

  it('quotes with JSON escaping in single quotes', () => {
    const source = generateManifest({ routes: [{ pattern: "/it's", file: 'x' }], notFound: null }, () => 'C:\\a "b"\n')
    expect(source).toContain(`  '/it\\'s': () => import('C:\\\\a "b"\\n'),`)
    // The emitted line is valid JS that evaluates back to the same strings.
    const line = source.split('\n')[2]
    const [key, spec] = [...line.matchAll(/'((?:\\.|[^'\\])*)'/g)].map((m) => Function(`return '${m[1]}'`)())
    expect(key).toBe("/it's")
    expect(spec).toBe('C:\\a "b"\n')
  })
})

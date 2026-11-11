// @vitest-environment node
// R14 (N170): one table of route rules, run against both manifest sources. A
// hand-written manifest goes through validateManifest(); a scanned one through
// scanPages(). Each row says what each source must report for the same rule,
// and the sort order of valid routes must agree too (M-6, S-6).
import { describe, it, expect } from 'vitest'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { PATTERN_RULES, compareRoutes, patternIssue, validateManifest } from '../src/match.js'
import { scanPages } from '../src/node/scanner.js'

const fn = () => Promise.resolve({ default: () => '' })

/**
 * @param {string[]} files page files relative to a fresh pages dir
 * @returns {Promise<{ routes: { pattern: string, file: string }[] } | Error>}
 */
async function scan(files) {
  const dir = mkdtempSync(join(tmpdir(), 'quiver-rules-'))
  for (const file of files) {
    mkdirSync(dirname(join(dir, file)), { recursive: true })
    writeFileSync(join(dir, file), 'export default () => ""\n')
  }
  return scanPages(dir).catch((error) => error)
}

/** @param {string[]} keys */
function manifest(keys) {
  try {
    validateManifest(Object.fromEntries(keys.map((key) => [key, fn])), undefined)
    return null
  } catch (error) {
    return /** @type {Error} */ (error)
  }
}

/**
 * code: the rule broken; keys: a hand-written manifest; files: pages that scan to
 * the same patterns (null where no file name can spell the pattern); then the
 * text each source must report.
 * @type {{ code: string, keys: string[], files: string[] | null, manual: string, scanned: string | null }[]}
 */
const RULES = [
  { code: 'leading-slash', keys: ['users'], files: null, manual: '"users" must start with "/"', scanned: null },
  { code: 'trailing-slash', keys: ['/users/'], files: null, manual: '"/users/" must not end with "/"', scanned: null },
  { code: 'empty-segment', keys: ['/a//b'], files: null, manual: 'must not contain an empty segment', scanned: null },
  { code: 'query-or-hash', keys: ['/a?b'], files: ['a?b.js'], manual: '"/a?b" must not contain "?" or "#"', scanned: 'Route "/a?b" from a?b.js contains "?" or "#".' },
  { code: 'query-or-hash', keys: ['/a#b'], files: ['a#b.js'], manual: '"/a#b" must not contain "?" or "#"', scanned: 'Route "/a#b" from a#b.js contains "?" or "#".' },
  { code: 'wildcard', keys: ['/files/*'], files: ['files/*.js'], manual: 'must not contain a wildcard ("*")', scanned: 'Route "/files/*" from files/*.js contains a wildcard ("*").' },
  { code: 'param-name', keys: ['/u/:1x'], files: ['u/[1x].js'], manual: 'has an invalid parameter name ":1x"', scanned: 'Route "/u/:1x" from u/[1x].js has an invalid parameter name ":1x".' },
  { code: 'param-repeat', keys: ['/u/:id/:id'], files: ['u/[id]/[id].js'], manual: 'repeats the parameter ":id"', scanned: 'Route "/u/:id/:id" from u/[id]/[id].js repeats the parameter ":id".' },
  { code: 'same', keys: ['/café', '/café'], files: ['café.js', 'café/index.js'], manual: 'is the same route as "/café"', scanned: 'both map to "/café"' },
  { code: 'same', keys: ['/users', '/us%65rs'], files: ['users.js', 'users/index.js'], manual: 'is the same route as "/users"', scanned: 'users.js and users/index.js both map to "/users".' },
  { code: 'shape', keys: ['/u/:id', '/u/:slug'], files: ['u/[id].js', 'u/[slug].js'], manual: '"/u/:slug" differs from "/u/:id" only in parameter names', scanned: 'u/[id].js and u/[slug].js differ only in parameter names' },
]

describe('route rules, manual and scanned manifests (R14)', () => {
  it('the table covers every shared rule', () => {
    const codes = new Set(RULES.map((r) => r.code))
    for (const rule of PATTERN_RULES) expect(codes).toContain(rule.code)
    for (const code of ['param-name', 'param-repeat', 'same', 'shape']) expect(codes).toContain(code)
  })

  it.each(RULES)('$code: $keys', async ({ code, keys, files, manual, scanned }) => {
    if (code !== 'same' && code !== 'shape') expect(patternIssue(keys[0])?.code).toBe(code)

    const error = manifest(keys)
    expect(error).toBeInstanceOf(TypeError)
    expect(error?.message).toContain(manual)

    if (!files) return
    const result = await scan(files)
    expect(result).toBeInstanceOf(Error)
    expect(/** @type {Error} */ (result).message).toContain(/** @type {string} */ (scanned))
  })

  it('valid routes pass both and sort the same way', async () => {
    const files = ['index.js', 'about.js', 'users/index.js', 'users/[id].js', 'users/new.js', 'blog/[slug]/comments.js', '[a]/[b].js', 'release notes.js']
    const result = await scan(files)
    expect(result).not.toBeInstanceOf(Error)
    const patterns = /** @type {{ routes: { pattern: string }[] }} */ (result).routes.map((r) => r.pattern)
    expect(manifest(patterns)).toBeNull()
    for (const pattern of patterns) expect(patternIssue(pattern)).toBeNull()
    expect([...patterns].sort(compareRoutes)).toEqual([...[...patterns].reverse()].sort(compareRoutes))
    expect([...patterns].sort(compareRoutes)).toEqual([
      '/blog/:slug/comments', '/users/new', '/users/:id', '/about', '/release notes', '/users', '/:a/:b', '/',
    ])
  })
})

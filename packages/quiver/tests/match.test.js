import { describe, it, expect } from 'vitest'
import { scoreRoute, normalizePath, matchPath, compareRoutes, validateManifest, canonicalSegment } from '../src/match.js'

const fn = () => ({ default: () => '' })

describe('scoreRoute', () => {
  it('gives root path the lowest score so it is checked last', () => {
    expect(scoreRoute('/')).toBe(0)
  })

  it('ranks static routes above dynamic ones of the same depth', () => {
    expect(scoreRoute('/users/profile')).toBeGreaterThan(scoreRoute('/users/:id'))
  })

  it('ranks more specific (longer) routes above shorter ones', () => {
    expect(scoreRoute('/users/:id')).toBeGreaterThan(scoreRoute('/users'))
  })
})

describe('compareRoutes (M-6)', () => {
  const sort = (/** @type {string[]} */ keys) => [...keys].sort(compareRoutes)

  it('gives the same order whatever the input order', () => {
    const keys = ['/', '/users', '/users/:id', '/users/profile', '/:a/b', '/a/:b', '/z/:y', '/b/:c']
    const reversed = [...keys].reverse()
    expect(sort(keys)).toEqual(sort(reversed))
  })

  it('/a/:b beats /:a/b (static first, left to right)', () => {
    expect(sort(['/:a/b', '/a/:b'])).toEqual(['/a/:b', '/:a/b'])
  })

  it('breaks remaining ties by key in code-unit order', () => {
    expect(sort(['/b/:x', '/a/:x', '/B/:x'])).toEqual(['/B/:x', '/a/:x', '/b/:x'])
  })

  it('higher score first', () => {
    expect(sort(['/', '/users/:id', '/users', '/users/me'])).toEqual(['/users/me', '/users/:id', '/users', '/'])
  })
})

describe('normalizePath', () => {
  it.each([
    ['/users/', '/users'],
    ['/', '/'],
    ['/users?foo=bar', '/users'],
    ['/users#section', '/users'],
    ['/users?foo=bar#section', '/users'],
    ['', '/'],
  ])('%j → %j', (input, expected) => {
    expect(normalizePath(input)).toBe(expected)
  })

  it('defaults to root when called with no argument', () => {
    expect(normalizePath()).toBe('/')
  })
})

describe('matchPath (M-7)', () => {
  it('matches an exact static path and returns empty params', () => {
    expect(matchPath('/users', '/users')).toEqual({})
  })

  it('matches root against root', () => {
    expect(matchPath('/', '/')).toEqual({})
  })

  it('extracts a dynamic param', () => {
    expect(matchPath('/users/:id', '/users/42')).toEqual({ id: '42' })
  })

  it('returns null on a static segment mismatch', () => {
    expect(matchPath('/users/:id', '/posts/42')).toBeNull()
  })

  it('returns null when segment count differs', () => {
    expect(matchPath('/users/:id', '/users/42/extra')).toBeNull()
    expect(matchPath('/users/:id/profile', '/users/42')).toBeNull()
  })

  it('decodes a URL-encoded param value', () => {
    expect(matchPath('/users/:id', '/users/hello%20world')).toEqual({ id: 'hello world' })
  })

  it('falls back to the raw segment on a malformed percent-escape', () => {
    expect(matchPath('/users/:id', '/users/%zz')).toEqual({ id: '%zz' })
  })
})

describe('static segments with spaces and Unicode (R05, N135)', () => {
  it('canonicalSegment decodes escapes and normalises to NFC', () => {
    expect(canonicalSegment('release%20notes')).toBe('release notes')
    expect(canonicalSegment('caf%C3%A9')).toBe('caf\u00e9')
    expect(canonicalSegment('caf%c3%a9')).toBe('caf\u00e9')
    expect(canonicalSegment('cafe\u0301')).toBe('caf\u00e9')
    expect(canonicalSegment('cafe%CC%81')).toBe('caf\u00e9')
    expect(canonicalSegment('a%2Fb')).toBe('a/b')
  })

  it('canonicalSegment keeps a malformed escape as written', () => {
    expect(canonicalSegment('100%')).toBe('100%')
    expect(canonicalSegment('%zz')).toBe('%zz')
    expect(canonicalSegment('%E9')).toBe('%E9')
  })

  // The pathname a browser reports for each spelling.
  const encoded = (/** @type {string} */ path) => new URL(path, 'https://x.test').pathname

  it.each([
    ['/release notes', '/release notes'],
    ['/release notes', '/release%20notes'],
    ['/release%20notes', '/release notes'],
    ['/caf\u00e9', '/caf\u00e9'],
    ['/caf\u00e9', '/caf%C3%A9'],
    ['/caf\u00e9', '/cafe\u0301'],
    ['/caf%C3%A9', '/caf\u00e9'],
    ['/cafe\u0301', '/caf\u00e9'],
    ['/caf%c3%a9/:id', '/caf\u00e9/1'],
  ])('key %j matches the browser pathname for %j', (key, path) => {
    expect(matchPath(key, encoded(path))).not.toBeNull()
  })

  it('keeps segment boundaries: an encoded "/" never splits a segment', () => {
    expect(matchPath('/a%2Fb', '/a%2Fb')).toEqual({})
    expect(matchPath('/a%2Fb', '/a/b')).toBeNull()
    expect(matchPath('/a/b', '/a%2Fb')).toBeNull()
    expect(matchPath('/:x', '/a%2Fb')).toEqual({ x: 'a/b' })
  })

  it('a malformed escape matches only itself', () => {
    expect(matchPath('/100%', encoded('/100%'))).toEqual({})
    expect(matchPath('/100%', '/100%25')).toEqual({})
    expect(matchPath('/100%', '/100')).toBeNull()
  })

  it('parameters are decoded but not normalised', () => {
    expect(matchPath('/tags/:t', '/tags/cafe%CC%81')).toEqual({ t: 'cafe\u0301' })
  })

  it('a static Unicode route still beats a parameter at the same position', () => {
    const keys = ['/users/:id', '/users/caf\u00e9'].sort(compareRoutes)
    const hit = keys.find((k) => matchPath(k, encoded('/users/caf\u00e9')))
    expect(hit).toBe('/users/caf\u00e9')
    expect(keys.find((k) => matchPath(k, '/users/42'))).toBe('/users/:id')
  })

  it('validateManifest rejects two spellings of one route', () => {
    expect(() => validateManifest({ '/caf\u00e9': fn, '/caf%C3%A9': fn }, undefined))
      .toThrow('route "/caf%C3%A9" is the same route as "/caf\u00e9"')
    expect(() => validateManifest({ '/a b/:id': fn, '/a%20b/:id': fn }, undefined)).toThrow('is the same route as "/a b/:id"')
    expect(() => validateManifest({ '/a b/:id': fn, '/a%20b/:slug': fn }, undefined)).toThrow('differs from "/a b/:id" only in parameter names')
    expect(() => validateManifest({ '/a': fn, '/%3A': fn, '/:x': fn }, undefined)).not.toThrow()
  })
})

describe('validateManifest (C-12)', () => {
  const rejects = (/** @type {unknown} */ routes, /** @type {RegExp | string} */ message, /** @type {unknown} */ notFound) =>
    expect(() => validateManifest(routes, notFound)).toThrow(message instanceof RegExp ? message : new RegExp(message.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))

  it('accepts a valid manifest', () => {
    expect(() => validateManifest({ '/': fn, '/users': fn, '/users/:id': fn, '/not-found': fn }, fn)).not.toThrow()
  })

  it('M-1: routes must be a plain object of functions', () => {
    for (const bad of [undefined, null, [], 'x', new Map()]) {
      expect(() => validateManifest(bad, undefined)).toThrow(TypeError)
    }
    rejects({ '/': fn, '/x': 'nope' }, '"/x" must map to a loader function')
  })

  it('M-2: key shape', () => {
    rejects({ users: fn }, '"users" must start with "/"')
    rejects({ '/users/': fn }, '"/users/" must not end with "/"')
    rejects({ '/a//b': fn }, '"/a//b" must not contain an empty segment')
    rejects({ '/a?x=1': fn }, '"/a?x=1" must not contain "?" or "#"')
    rejects({ '/a#x': fn }, '"/a#x" must not contain "?" or "#"')
  })

  it('M-3: parameter names, uniqueness, no wildcards or optional segments', () => {
    rejects({ '/u/:1d': fn }, '"/u/:1d" has an invalid parameter name ":1d"')
    rejects({ '/u/:': fn }, 'invalid parameter name')
    rejects({ '/u/:id/:id': fn }, '"/u/:id/:id" repeats the parameter ":id"')
    rejects({ '/files/*': fn }, '"/files/*" must not contain a wildcard')
    rejects({ '/u/:id?': fn }, '"/u/:id?" must not contain "?"')
    expect(() => validateManifest({ '/u/:_id/:$x': fn }, undefined)).not.toThrow()
  })

  it('M-4: keys differing only in parameter names are rejected', () => {
    rejects({ '/u/:id': fn, '/u/:slug': fn }, '"/u/:slug" differs from "/u/:id" only in parameter names')
  })

  it('M-5: notFound must be a function; /not-found is an ordinary key', () => {
    rejects({ '/': fn }, 'notFound must be a loader function', 'pages/not-found.js')
    expect(() => validateManifest({ '/not-found': fn }, undefined)).not.toThrow()
  })
})

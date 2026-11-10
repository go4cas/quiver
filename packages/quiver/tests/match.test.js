import { describe, it, expect } from 'vitest'
import { scoreRoute, normalizePath, matchPath, compareRoutes, validateManifest } from '../src/match.js'

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

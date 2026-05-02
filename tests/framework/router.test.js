import { describe, it, expect } from 'vitest'
import {
  fileToRoutePath,
  scoreRoute,
  normalizePath,
  matchPath,
} from '../../src/framework/router.js'

describe('fileToRoutePath', () => {
  it('converts index.js to root', () => {
    expect(fileToRoutePath('../pages/index.js')).toBe('/')
  })

  it('converts a top-level page', () => {
    expect(fileToRoutePath('../pages/about.js')).toBe('/about')
  })

  it('converts a nested index to the directory path', () => {
    expect(fileToRoutePath('../pages/users/index.js')).toBe('/users')
  })

  it('converts a dynamic segment', () => {
    expect(fileToRoutePath('../pages/users/[id].js')).toBe('/users/:id')
  })

  it('converts a nested dynamic segment', () => {
    expect(fileToRoutePath('../pages/blog/[slug]/comments.js')).toBe('/blog/:slug/comments')
  })
})

describe('scoreRoute', () => {
  it('gives root path the lowest score so it is checked last', () => {
    expect(scoreRoute('/')).toBe(0)
  })

  it('root scores lower than any real route', () => {
    expect(scoreRoute('/')).toBeLessThan(scoreRoute('/users'))
  })

  it('ranks static routes above dynamic ones of the same depth', () => {
    expect(scoreRoute('/users/profile')).toBeGreaterThan(scoreRoute('/users/:id'))
  })

  it('ranks more specific (longer) routes above shorter ones', () => {
    expect(scoreRoute('/users/:id')).toBeGreaterThan(scoreRoute('/users'))
  })

  it('ranks all-static above mixed static/dynamic of same depth', () => {
    expect(scoreRoute('/a/b')).toBeGreaterThan(scoreRoute('/a/:b'))
  })
})

describe('normalizePath', () => {
  it('strips a trailing slash', () => {
    expect(normalizePath('/users/')).toBe('/users')
  })

  it('preserves the root slash', () => {
    expect(normalizePath('/')).toBe('/')
  })

  it('strips a query string', () => {
    expect(normalizePath('/users?foo=bar')).toBe('/users')
  })

  it('strips a hash fragment', () => {
    expect(normalizePath('/users#section')).toBe('/users')
  })

  it('defaults to root when called with no argument', () => {
    expect(normalizePath()).toBe('/')
  })

  it('strips both query string and hash', () => {
    expect(normalizePath('/users?foo=bar#section')).toBe('/users')
  })
})

describe('matchPath', () => {
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
  })

  it('decodes a URL-encoded param value', () => {
    expect(matchPath('/users/:id', '/users/hello%20world')).toEqual({ id: 'hello world' })
  })

  it('returns null when route has more segments than url', () => {
    expect(matchPath('/users/:id/profile', '/users/42')).toBeNull()
  })
})

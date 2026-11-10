import { describe, it, expect, afterEach } from 'vitest'
import { stripBase, url, resolveBase, setBase, getBase } from '../src/base.js'
import { destroy } from '../src/app.js'
import { initRouter } from '../src/router.js'
import { installNavigation, setLocation } from './helpers/navigation.js'
import { vi } from 'vitest'

afterEach(() => {
  setBase('/')
  document.querySelectorAll('base').forEach((el) => el.remove())
})

describe('stripBase (C-20)', () => {
  it.each([
    ['/app/', '/'],
    ['/app', '/'],
    ['/app/x', '/x'],
    ['/app/x/y', '/x/y'],
    ['/apple', null],
    ['/other', null],
    ['/', null],
    ['/APP/x', null],
  ])('base /app/: %s → %s', (pathname, expected) => {
    setBase('/app/')
    expect(stripBase(pathname)).toBe(expected)
  })

  it('base / never returns null', () => {
    expect(stripBase('/')).toBe('/')
    expect(stripBase('/anything/at/all')).toBe('/anything/at/all')
  })

  it('compares the raw, percent-encoded pathname', () => {
    setBase('/my%20app/')
    expect(stripBase('/my%20app/x')).toBe('/x')
    expect(stripBase('/my app/x')).toBeNull()
  })
})

describe('url (C-22)', () => {
  it.each([
    ['/', '/app/'],
    ['', '/app/'],
    ['/runs/42?tab=log#x', '/app/runs/42?tab=log#x'],
    ['runs', '/app/runs'],
    ['/runs', '/app/runs'],
    ['https://example.com/x', 'https://example.com/x'],
    ['mailto:a@b.c', 'mailto:a@b.c'],
    ['//cdn.example.com/x.js', '//cdn.example.com/x.js'],
  ])('base /app/: url(%j) → %j', (path, expected) => {
    setBase('/app/')
    expect(url(path)).toBe(expected)
  })

  it.each([
    ['/', '/'],
    ['', '/'],
    ['/runs/42?tab=log#x', '/runs/42?tab=log#x'],
    ['runs', '/runs'],
  ])('base /: url(%j) → %j', (path, expected) => {
    expect(url(path)).toBe(expected)
  })

  it('uses base / before initRouter() and after destroy()', async () => {
    expect(url('/x')).toBe('/x')
    installNavigation()
    setLocation('/app/')
    await initRouter({ routes: { '/': () => ({ default: () => '' }) }, base: '/app/' })
    expect(url('/x')).toBe('/app/x')
    destroy()
    expect(url('/x')).toBe('/x')
    expect(getBase()).toBe('/')
    vi.unstubAllGlobals()
    setLocation('/')
  })
})

describe('resolveBase (C-13)', () => {
  it('takes an explicit base and adds a missing trailing slash', () => {
    expect(resolveBase('/app/')).toBe('/app/')
    expect(resolveBase('/app')).toBe('/app/')
    expect(resolveBase('/')).toBe('/')
  })

  it('rejects a base that does not start with /', () => {
    expect(() => resolveBase('app/')).toThrow(TypeError)
    expect(() => resolveBase('https://x.test/app/')).toThrow(TypeError)
  })

  it('an explicit base wins over <base href>', () => {
    document.head.insertAdjacentHTML('beforeend', '<base href="/other/">')
    expect(resolveBase('/app/')).toBe('/app/')
  })

  it('uses the directory of <base href> pointing at a directory', () => {
    document.head.insertAdjacentHTML('beforeend', '<base href="/app/">')
    expect(resolveBase()).toBe('/app/')
  })

  it('uses the directory of <base href> pointing at a file', () => {
    document.head.insertAdjacentHTML('beforeend', '<base href="/app/index.html">')
    expect(resolveBase()).toBe('/app/')
  })

  it('defaults to / without a <base>, whatever document.baseURI is (N1)', () => {
    setLocation('/users/42')
    expect(document.baseURI).toMatch(/\/users\/42$/)
    expect(resolveBase()).toBe('/')
    setLocation('/')
  })
})

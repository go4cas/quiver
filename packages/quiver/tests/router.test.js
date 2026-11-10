import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  scoreRoute,
  normalizePath,
  matchPath,
  initRouter,
  destroyRouter,
  resolveRoute,
  go,
  beforeEach as beforeEachGuard,
} from '../src/router.js'
import { routerState } from '../src/state.js'

// A stand-in for an app's route manifest (pattern → loader).
const page = () => null
const routes = {
  '/': () => ({ default: page }),
  '/users': () => ({ default: page }),
  '/users/:id': async () => ({ default: page }),
  '/login': () => ({ default: page }),
}
const notFound = () => ({ default: page })

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

  it('falls back to the raw segment on a malformed percent-escape', () => {
    expect(matchPath('/users/:id', '/users/%zz')).toEqual({ id: '%zz' })
  })

  it('returns null when route has more segments than url', () => {
    expect(matchPath('/users/:id/profile', '/users/42')).toBeNull()
  })
})

describe('initRouter — guards on initial load', () => {
  afterEach(() => {
    destroyRouter()
    vi.unstubAllGlobals()
    history.replaceState(null, '', '/')
  })

  it('runs guards for the first load with from=null and follows a redirect', async () => {
    vi.stubGlobal('navigation', {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })
    history.replaceState(null, '', '/users/42')

    const seen = []
    const off = beforeEachGuard(({ from, to }) => {
      seen.push({ from, to })
      if (to === '/users/42') return '/'
    })

    await initRouter({ routes, notFound })
    off()

    expect(seen[0]).toEqual({ from: null, to: '/users/42' })
    // Guards re-ran for the redirect target, then the router settled on it.
    expect(seen[1]).toEqual({ from: null, to: '/' })
    expect(window.location.pathname).toBe('/')
  })

  it('a guard returning false on initial load redirects to /', async () => {
    vi.stubGlobal('navigation', {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })
    history.replaceState(null, '', '/users/42')

    const off = beforeEachGuard(({ to }) => (to === '/users/42' ? false : undefined))
    await initRouter({ routes, notFound })
    off()

    expect(window.location.pathname).toBe('/')
    expect(routerState.status).toBe('ready')
  })
})

function makeNavStub() {
  /** @type {Record<string, Function>} */
  const listeners = {}
  return {
    addEventListener: (/** @type {string} */ name, /** @type {Function} */ fn) => { listeners[name] = fn },
    removeEventListener: vi.fn(),
    navigate: vi.fn(() => ({ finished: Promise.resolve() })),
    listeners,
  }
}

/** @param {string} url @param {object} [info] */
function makeEvent(url, info) {
  return {
    canIntercept: true,
    hashChange: false,
    info,
    destination: { url },
    /** @type {(() => Promise<void>) | null} */
    handler: null,
    intercept(/** @type {{ handler: () => Promise<void> }} */ opts) { this.handler = opts.handler },
  }
}

describe('handleNavigate — guard cancel, redirect, rollback', () => {
  afterEach(() => {
    destroyRouter()
    vi.unstubAllGlobals()
    history.replaceState(null, '', '/')
  })

  it('a cancelling guard rolls back with info.rollback and leaves the route untouched', async () => {
    const nav = makeNavStub()
    vi.stubGlobal('navigation', nav)
    history.replaceState(null, '', '/')
    await initRouter({ routes, notFound })

    const off = beforeEachGuard(({ to }) => (to === '/users/42' ? false : undefined))
    const event = makeEvent('http://localhost/users/42')
    nav.listeners.navigate(event)
    await event.handler?.()
    off()

    expect(nav.navigate).toHaveBeenCalledWith('/', { history: 'replace', info: { rollback: true } })
    expect(routerState.path).toBe('/')
    expect(routerState.status).toBe('ready')
  })

  it('a rollback navigation is not intercepted (no guard re-run, no remount)', async () => {
    const nav = makeNavStub()
    vi.stubGlobal('navigation', nav)
    history.replaceState(null, '', '/')
    await initRouter({ routes, notFound })

    const guard = vi.fn()
    const off = beforeEachGuard(guard)
    const event = makeEvent('http://localhost/', { rollback: true })
    nav.listeners.navigate(event)
    off()

    expect(event.handler).toBeNull() // intercept was never called
    expect(guard).not.toHaveBeenCalled()
  })

  it('a guard returning a path redirects via replace navigation', async () => {
    const nav = makeNavStub()
    vi.stubGlobal('navigation', nav)
    history.replaceState(null, '', '/')
    await initRouter({ routes, notFound })

    const off = beforeEachGuard(({ to }) => (to === '/users/42' ? '/login' : undefined))
    const event = makeEvent('http://localhost/users/42')
    nav.listeners.navigate(event)
    await event.handler?.()
    off()

    expect(nav.navigate).toHaveBeenCalledWith('/login', { history: 'replace' })
  })
})

describe('resolveRoute — manifest', () => {
  afterEach(() => {
    destroyRouter()
    vi.unstubAllGlobals()
    history.replaceState(null, '', '/')
  })

  /** @param {Record<string, () => any>} manifest @param {() => any} [nf] */
  async function start(manifest, nf) {
    vi.stubGlobal('navigation', makeNavStub())
    await initRouter({ routes: manifest, notFound: nf })
  }

  it('matches the most specific pattern whatever the key order', async () => {
    const byId = () => null
    const profile = () => null
    await start({ '/users/:id': () => ({ default: byId }), '/users/profile': () => ({ default: profile }) })

    await resolveRoute('/users/profile')
    expect(routerState.page).toBe(profile)
    await resolveRoute('/users/7')
    expect(routerState.page).toBe(byId)
    expect(routerState.params).toEqual({ id: '7' })
  })

  it('uses the notFound loader for unmatched paths', async () => {
    const missing = () => null
    await start(routes, () => ({ default: missing }))

    await resolveRoute('/nope')
    expect(routerState.status).toBe('not-found')
    expect(routerState.page).toBe(missing)
  })

  it('names the pattern when a page module has no default export', async () => {
    await start({ '/bad': () => ({}) })

    await resolveRoute('/bad')
    expect(routerState.status).toBe('error')
    expect(routerState.error).toBe('Route "/bad" must default export a page function.')
  })
})

describe('resolveRoute — supersession', () => {
  afterEach(() => {
    destroyRouter()
    vi.unstubAllGlobals()
  })

  it('a superseded resolve does not overwrite the newer navigation', async () => {
    vi.stubGlobal('navigation', makeNavStub())
    await initRouter({ routes, notFound })
    // Start resolving a dynamic route, then immediately navigate elsewhere.
    const first = resolveRoute('/users/42')
    const second = resolveRoute('/')
    await Promise.all([first, second])

    expect(routerState.path).toBe('/')
    expect(routerState.status).toBe('ready')
    expect(routerState.params).toEqual({})
  })
})

describe('go — abort handling', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('swallows AbortError when a navigation is preempted', async () => {
    const abortErr = Object.assign(new Error('aborted'), { name: 'AbortError' })
    vi.stubGlobal('navigation', { navigate: vi.fn(() => ({ finished: Promise.reject(abortErr) })) })
    await expect(go('/users')).resolves.toBeUndefined()
  })

  it('rethrows non-abort navigation errors', async () => {
    const err = Object.assign(new Error('boom'), { name: 'SecurityError' })
    vi.stubGlobal('navigation', { navigate: vi.fn(() => ({ finished: Promise.reject(err) })) })
    await expect(go('/users')).rejects.toThrow('boom')
  })
})

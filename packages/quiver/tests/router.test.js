import { describe, it, expect, vi, afterEach } from 'vitest'
import { nextTick } from '@arrow-js/core'
import { initRouter, go, beforeEach as guard, afterEach as after, onError } from '../src/router.js'
import { destroy } from '../src/app.js'
import { useRoute } from '../src/route.js'
import { installNavigation, setLocation } from './helpers/navigation.js'

const page = () => ''
const ok = () => ({ default: page })
const routes = {
  '/': ok,
  '/users': ok,
  '/users/:id': async () => ({ default: page }),
  '/login': ok,
}

afterEach(() => {
  destroy()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  setLocation('/')
})

/**
 * @param {Partial<import('../src/types.js').InitRouterOptions>} [options]
 * @param {string} [at]
 */
async function start(options = {}, at = '/') {
  const nav = installNavigation()
  setLocation(at)
  await initRouter({ routes, ...options })
  return nav
}

describe('initRouter: startup errors', () => {
  it('C-10: names the Navigation API browsers when navigation is missing', async () => {
    vi.stubGlobal('navigation', undefined)
    await expect(initRouter({ routes })).rejects.toThrow(
      'Quiver needs the Navigation API (Chrome/Edge 102+, Safari 26.2+, Firefox 147+). See https://go4cas.github.io/quiver/guide/routing#browser-support',
    )
  })

  it('C-11: a second initRouter() before destroy() throws', async () => {
    await start()
    await expect(initRouter({ routes })).rejects.toThrow('initRouter() was already called. Call destroy() first.')
  })

  it('C-12: an invalid manifest rejects with a TypeError before any navigation work', async () => {
    const nav = installNavigation()
    await expect(initRouter({ routes: { users: ok } })).rejects.toThrow(TypeError)
    expect(nav.addEventListener).not.toHaveBeenCalled()
    // Validation failure leaves the router uninitialised, so a fixed call works.
    await expect(initRouter({ routes })).resolves.toBeUndefined()
  })

  it('C-13: a base that does not start with / rejects with a TypeError', async () => {
    installNavigation()
    await expect(initRouter({ routes, base: 'app/' })).rejects.toThrow(TypeError)
  })

  it('C-14: the current URL outside the base throws', async () => {
    installNavigation()
    setLocation('/elsewhere')
    await expect(initRouter({ routes, base: '/app/' })).rejects.toThrow('Current URL "/elsewhere" is outside base "/app/".')
  })

  it('C-15: a rejecting loader still resolves, with status error', async () => {
    await expect(start({ routes: { '/': () => Promise.reject(new Error('down')) } })).resolves.toBeDefined()
    expect(useRoute().status()).toBe('error')
  })

  it('the base without its trailing slash counts as inside and resolves to /', async () => {
    await start({ base: '/app/' }, '/app')
    expect(useRoute().path()).toBe('/')
    expect(useRoute().status()).toBe('ready')
  })
})

describe('initRouter: initial-load guards (C-16)', () => {
  it('runs guards with from=null and follows a redirect, base applied', async () => {
    const seen = /** @type {unknown[]} */ ([])
    guard(({ from, to }) => {
      seen.push({ from, to })
      if (to === '/users/42') return '/login?next=42#top'
    })
    await start({ base: '/app/' }, '/app/users/42')

    expect(seen).toEqual([{ from: null, to: '/users/42' }, { from: null, to: '/login' }])
    expect(window.location.pathname + window.location.search + window.location.hash).toBe('/app/login?next=42#top')
    expect(useRoute().path()).toBe('/login')
  })

  it('a guard returning false redirects to /', async () => {
    guard(({ to }) => (to === '/users/42' ? false : undefined))
    await start({ base: '/app/' }, '/app/users/42')
    expect(window.location.pathname).toBe('/app/')
    expect(useRoute().status()).toBe('ready')
  })

  it('C-27: caps initial redirects at 10 with a guard error', async () => {
    let n = 0
    guard(() => `/hop/${n++}`)
    await start({ routes: { ...routes, '/hop/:n': ok } }, '/start')
    expect(useRoute().status()).toBe('error')
    expect(n).toBe(11)
  })

  it('a throwing guard on the initial load is a guard error', async () => {
    guard(() => { throw new Error('nope') })
    await start()
    expect(useRoute().status()).toBe('error')
  })
})

describe('base-relative paths (C-21)', () => {
  it('guards, hooks and useRoute().path() see base-relative, normalised paths', async () => {
    const nav = await start({ base: '/app/' }, '/app/')
    const seen = /** @type {unknown[]} */ ([])
    guard((ctx) => { seen.push(['guard', ctx]) })
    after((ctx) => { seen.push(['after', ctx]) })

    nav.navigate('/app/users/7/?tab=a#b')
    await nav.idle()

    expect(useRoute().path()).toBe('/users/7')
    expect(useRoute().params()).toEqual({ id: '7' })
    expect(seen).toEqual([
      ['guard', { from: '/', to: '/users/7' }],
      ['after', { from: '/', to: '/users/7', status: 'ready' }],
    ])
  })
})

describe('intercept filter (§2 step 1)', () => {
  it('does not intercept a navigation outside the base (R3)', async () => {
    const nav = await start({ base: '/app/' }, '/app/')
    const g = vi.fn()
    guard(g)
    nav.navigate('/apple')
    nav.navigate('/other/page')
    await nav.idle()
    expect(nav.documentLoads).toEqual(['http://localhost:3000/apple', 'http://localhost:3000/other/page'])
    expect(g).not.toHaveBeenCalled()
  })

  it('intercepts /app for base /app/ and resolves it to /', async () => {
    const nav = await start({ base: '/app/' }, '/app/users')
    nav.navigate('/app')
    await nav.idle()
    expect(nav.documentLoads).toEqual([])
    expect(useRoute().path()).toBe('/')
  })

  it('leaves form POSTs, downloads and hash changes to the browser', async () => {
    const nav = await start()
    const g = vi.fn()
    guard(g)
    nav.dispatch('/users', { type: 'push', formData: new FormData() })
    nav.dispatch('/users', { type: 'push', downloadRequest: 'file.txt' })
    nav.dispatch('/#section', { type: 'push' })
    await nav.idle()
    expect(nav.documentLoads).toHaveLength(3)
    expect(g).not.toHaveBeenCalled()
  })

  it('a rollback navigation is not intercepted (no guard re-run, no remount)', async () => {
    const nav = await start()
    const g = vi.fn()
    guard(g)
    nav.navigate('/', { history: 'replace', info: { rollback: true } })
    expect(g).not.toHaveBeenCalled()
  })
})

describe('guards (C-32, C-33)', () => {
  it('a cancelling guard rolls back to url(from) and leaves the route untouched (C-28)', async () => {
    const nav = await start({ base: '/app/' }, '/app/users')
    const a = vi.fn()
    after(a)
    guard(({ to }) => (to === '/login' ? false : undefined))
    nav.navigate('/app/login')
    await nav.idle()
    expect(nav.navigate).toHaveBeenLastCalledWith('/app/users', { history: 'replace', info: { rollback: true } })
    expect(useRoute().path()).toBe('/users')
    expect(useRoute().status()).toBe('ready')
    expect(a).not.toHaveBeenCalled()
  })

  it('a redirect string is base-relative and keeps query and hash (N21)', async () => {
    const nav = await start({ base: '/app/' }, '/app/')
    guard(({ to }) => (to === '/users' ? '/login?next=users#form' : undefined))
    nav.navigate('/app/users')
    await nav.idle()
    expect(nav.navigate).toHaveBeenCalledWith('/app/login?next=users#form', { history: 'replace', info: { redirects: 1, first: '/users' } })
    expect(useRoute().path()).toBe('/login')
    expect(window.location.search).toBe('?next=users')
  })

  it('run in registration order and stop at the first false or string', async () => {
    const order = /** @type {string[]} */ ([])
    guard(() => { order.push('a') })
    guard(() => { order.push('b'); return false })
    guard(() => { order.push('c') })
    const nav = await start()
    order.length = 0
    await go('/users')
    await nav.idle()
    expect(order).toEqual(['a', 'b'])
  })

  it('unregister is idempotent and does not skip the next guard mid-run', async () => {
    const order = /** @type {string[]} */ ([])
    /** @type {() => void} */
    let offA = () => {}
    offA = guard(() => { order.push('a'); offA(); offA() })
    guard(() => { order.push('b') })
    const offC = guard(() => { order.push('c') })
    offC()
    offC()
    await start()
    expect(order).toEqual(['a', 'b'])
  })
})

describe('hooks (C-25, C-34)', () => {
  it('afterEach fires once per committed navigation', async () => {
    const nav = await start()
    const a = vi.fn()
    after(a)
    await go('/users')
    await nav.idle()
    await go('/nope')
    await nav.idle()
    expect(a.mock.calls).toEqual([
      [{ from: '/', to: '/users', status: 'ready' }],
      [{ from: '/users', to: '/nope', status: 'not-found' }],
    ])
  })

  it('a redirect fires afterEach for the target only', async () => {
    const nav = await start()
    const a = vi.fn()
    after(a)
    guard(({ to }) => (to === '/users' ? '/login' : undefined))
    await go('/users')
    await nav.idle()
    expect(a.mock.calls).toEqual([[{ from: '/', to: '/login', status: 'ready' }]])
  })

  it('a superseded navigation fires no hooks', async () => {
    const nav = await start()
    const a = vi.fn()
    after(a)
    /** @type {(v: any) => void} */
    let release = () => {}
    const slow = new Promise((r) => { release = r })
    destroy()
    installNavigation()
    await initRouter({ routes: { '/': ok, '/slow': () => slow, '/fast': ok } })
    after(a)
    const n = /** @type {any} */ (globalThis).navigation
    n.navigate('/slow')
    n.navigate('/fast')
    release({ default: page })
    await n.idle()
    await nav.idle()
    expect(a.mock.calls).toEqual([[{ from: '/', to: '/fast', status: 'ready' }]])
    expect(useRoute().path()).toBe('/fast')
  })

  it('a throwing handler is logged and the rest still run', async () => {
    const nav = await start()
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    const err = new Error('hook')
    const second = vi.fn()
    after(() => { throw err })
    after(second)
    const e2 = vi.fn()
    onError(() => { throw err })
    onError(e2)
    await go('/users')
    await nav.idle()
    expect(second).toHaveBeenCalledTimes(1)
    expect(log).toHaveBeenCalledWith('[quiver] afterEach handler threw', err)

    destroy()
    installNavigation()
    setLocation('/')
    onError(() => { throw err })
    onError(e2)
    const n = /** @type {any} */ (globalThis).navigation
    await initRouter({ routes: { '/': ok, '/bad': () => Promise.reject(new Error('x')) } })
    n.navigate('/bad')
    await n.idle()
    expect(e2).toHaveBeenCalledTimes(1)
    expect(log).toHaveBeenCalledWith('[quiver] onError handler threw', err)
  })

  it('C-27: in-app redirects are capped at 10 hops', async () => {
    const nav = await start({ routes: { ...routes, '/hop/:n': ok } })
    const errors = vi.fn()
    const a = vi.fn()
    onError(errors)
    after(a)
    let n = 0
    guard(({ to }) => (to.startsWith('/hop') || to === '/users' ? `/hop/${n++}` : undefined))
    nav.navigate('/users')
    await nav.idle()
    expect(n).toBe(11)
    expect(useRoute().status()).toBe('error')
    expect(errors).toHaveBeenCalledTimes(1)
    const ctx = errors.mock.calls[0][0]
    expect(ctx.phase).toBe('guard')
    expect(ctx.error.message).toBe('Too many redirects (10) from "/users".')
    expect(a).toHaveBeenCalledWith({ from: '/', to: '/hop/9', status: 'error' })
  })

  it('a throwing guard reaches onError with phase guard', async () => {
    const nav = await start()
    const errors = vi.fn()
    onError(errors)
    const boom = new Error('guard down')
    guard(({ to }) => { if (to === '/users') throw boom })
    nav.navigate('/users')
    await nav.idle()
    expect(errors).toHaveBeenCalledWith({ error: boom, from: '/', to: '/users', phase: 'guard' })
    expect(useRoute().status()).toBe('error')
    expect(useRoute().path()).toBe('/users')
  })
})

describe('go (C-30, C-31)', () => {
  it('navigates to url(path), keeping query and hash', async () => {
    const nav = await start({ base: '/app/' }, '/app/')
    await go('/users?tab=a#top')
    expect(nav.navigate).toHaveBeenCalledWith('/app/users?tab=a#top')
    await nav.idle()
    expect(window.location.pathname + window.location.search + window.location.hash).toBe('/app/users?tab=a#top')
  })

  it('swallows AbortError when a navigation is preempted', async () => {
    const nav = await start()
    const abortErr = Object.assign(new Error('aborted'), { name: 'AbortError' })
    nav.navigate.mockReturnValueOnce({ committed: Promise.resolve(), finished: Promise.reject(abortErr) })
    await expect(go('/users')).resolves.toBeUndefined()
  })

  it('rethrows non-abort navigation errors', async () => {
    const nav = await start()
    const err = Object.assign(new Error('boom'), { name: 'SecurityError' })
    nav.navigate.mockReturnValueOnce({ committed: Promise.resolve(), finished: Promise.reject(err) })
    await expect(go('/users')).rejects.toThrow('boom')
  })

  it('throws before initRouter() and after destroy()', async () => {
    const msg = 'Quiver router is not initialised. Call initRouter() first.'
    expect(() => go('/')).toThrow(msg)
    await start()
    destroy()
    expect(() => go('/')).toThrow(msg)
  })
})

describe('manifest matching (M-6, M-7)', () => {
  it('matches the most specific pattern whatever the key order', async () => {
    const byId = () => 'id'
    const profile = () => 'profile'
    const nav = await start({ routes: { '/users/:id': () => ({ default: byId }), '/users/profile': () => ({ default: profile }), '/': ok } })
    await go('/users/profile')
    await nav.idle()
    expect(useRoute().path()).toBe('/users/profile')
    expect(useRoute().params()).toEqual({})
    await go('/users/7')
    await nav.idle()
    expect(useRoute().params()).toEqual({ id: '7' })
  })

  it('uses the notFound loader for unmatched paths', async () => {
    await start({ notFound: ok }, '/nope')
    expect(useRoute().status()).toBe('not-found')
  })

  it('without notFound an unmatched path is not-found', async () => {
    await start({}, '/nope')
    expect(useRoute().status()).toBe('not-found')
  })

  it('names the pattern when a page module has no default export (load error)', async () => {
    const nav = await start({ routes: { '/': ok, '/bad': () => /** @type {any} */ ({}) } })
    const errors = vi.fn()
    onError(errors)
    await go('/bad')
    await nav.idle()
    expect(useRoute().status()).toBe('error')
    expect(errors.mock.calls[0][0].phase).toBe('load')
    expect(errors.mock.calls[0][0].error.message).toBe('Route "/bad" must default export a page function.')
  })

  it('applies a static meta.title after load', async () => {
    document.title = ''
    await start({ routes: { '/': () => ({ default: page, meta: { title: 'Home' } }) } })
    expect(document.title).toBe('Home')
  })

  it('query-only changes re-run the pipeline', async () => {
    const nav = await start()
    const a = vi.fn()
    after(a)
    await go('/?q=1')
    await nav.idle()
    expect(a).toHaveBeenCalledWith({ from: '/', to: '/', status: 'ready' })
  })
})

describe('useRoute reactivity (C-60)', () => {
  it('getters follow navigations', async () => {
    const nav = await start()
    const route = useRoute()
    const seen = /** @type {string[]} */ ([])
    const { watch } = await import('@arrow-js/core')
    const [, stop] = watch(() => { seen.push(`${route.path()}:${route.status()}`) })
    await go('/users/9')
    await nav.idle()
    await nextTick()
    stop()
    expect(seen.at(-1)).toBe('/users/9:ready')
    expect(route.params()).toEqual({ id: '9' })
  })
})

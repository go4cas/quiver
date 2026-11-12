// Middleware passed to initRouter (TECH-SPEC §12.4, C-70…C-72, M-21).
import { describe, it, expect, vi, afterEach } from 'vitest'
import { initRouter, go, beforeEach as guard, afterEach as after, onError } from '../src/router.js'
import { destroy } from '../src/app.js'
import { useRoute } from '../src/route.js'
import { sectionCovers, compareSections, validateMiddleware } from '../src/match.js'
import { installNavigation, setLocation } from './helpers/navigation.js'

const page = () => ''
const ok = () => ({ default: page })
const routes = {
  '/': ok,
  '/login': ok,
  '/admin': ok,
  '/admin/users/:id': ok,
  '/administrator': ok,
  '/users/:id': ok,
  '/users/:slug/edit': ok,
}

afterEach(() => {
  destroy()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  setLocation('/')
})

/**
 * @param {import('../src/types.js').MiddlewareManifest} middleware
 * @param {Partial<import('../src/types.js').InitRouterOptions>} [options]
 * @param {string} [at]
 */
async function start(middleware, options = {}, at = '/') {
  const nav = installNavigation()
  setLocation(at)
  await initRouter({ routes, notFound: ok, middleware, ...options })
  return nav
}

describe('M-21: which sections cover a route', () => {
  it('/admin covers /admin and /admin/users/:id, not /administrator', () => {
    expect(sectionCovers('/admin', '/admin')).toBe(true)
    expect(sectionCovers('/admin', '/admin/users/:id')).toBe(true)
    expect(sectionCovers('/admin', '/administrator')).toBe(false)
  })

  it('parameter segments are equal whatever their names; static never equals a parameter', () => {
    expect(sectionCovers('/users/:id', '/users/:slug/edit')).toBe(true)
    expect(sectionCovers('/users/:id', '/users/me')).toBe(false)
    expect(sectionCovers('/users/me', '/users/:id')).toBe(false)
  })

  it('/ covers every route; a deeper section never covers a shallower route', () => {
    expect(sectionCovers('/', '/')).toBe(true)
    expect(sectionCovers('/', '/admin/users/:id')).toBe(true)
    expect(sectionCovers('/admin/users', '/admin')).toBe(false)
  })

  it('static segments compare canonically (M-8)', () => {
    expect(sectionCovers('/caf%C3%A9', '/café/menu')).toBe(true)
    expect(sectionCovers('/release notes', '/release%20notes')).toBe(true)
  })

  it('sections sort outermost first, then by key', () => {
    expect(['/admin/users', '/b', '/', '/a'].sort(compareSections)).toEqual(['/', '/a', '/b', '/admin/users'])
  })
})

describe('C-70: validation', () => {
  /** @param {unknown} middleware */
  const check = (middleware) => () => validateMiddleware(middleware)

  it('accepts undefined, an empty object and well-formed lists', () => {
    expect(check(undefined)).not.toThrow()
    expect(check({})).not.toThrow()
    expect(check({ global: [page], sections: { '/': [page], '/users/:id': [] } })).not.toThrow()
  })

  it('rejects a non-object middleware', () => {
    expect(check(null)).toThrow(TypeError)
    expect(check([])).toThrow('initRouter(): middleware must be a plain object { global?, sections? }.')
  })

  it('names the global index that is not a function', () => {
    expect(check({ global: page })).toThrow('initRouter(): middleware.global must be an array of guard functions.')
    expect(check({ global: [page, 'x'] })).toThrow('initRouter(): middleware.global[1] must be a function.')
  })

  it('names the section key that is invalid or holds a non-function', () => {
    expect(check({ sections: [] })).toThrow('initRouter(): middleware.sections must be a plain object mapping patterns to guard arrays.')
    expect(check({ sections: { admin: [page] } })).toThrow('initRouter(): middleware section "admin" must start with "/".')
    expect(check({ sections: { '/admin/': [page] } })).toThrow('initRouter(): middleware section "/admin/" must not end with "/".')
    expect(check({ sections: { '/:1x': [page] } })).toThrow('initRouter(): middleware section "/:1x" has an invalid parameter name ":1x".')
    expect(check({ sections: { '/admin': page } })).toThrow('initRouter(): middleware.sections["/admin"] must be an array of guard functions.')
    expect(check({ sections: { '/admin': [page, null] } })).toThrow('initRouter(): middleware.sections["/admin"][1] must be a function.')
  })

  it('R32-08: a hole in a guard array is named by its index, global and section alike', () => {
    // eslint-disable-next-line no-sparse-arrays
    expect(check({ global: [page, , page] })).toThrow('initRouter(): middleware.global[1] must be a function.')
    const sparse = [page]
    sparse.length = 3
    expect(check({ sections: { '/admin': sparse } })).toThrow('initRouter(): middleware.sections["/admin"][1] must be a function.')
    expect(check({ global: [], sections: { '/admin': [] } })).not.toThrow()
  })

  it('initRouter rejects bad middleware before any navigation work, and a fixed call works', async () => {
    const nav = installNavigation()
    await expect(initRouter({ routes, middleware: /** @type {any} */ ({ global: [1] }) })).rejects.toThrow(TypeError)
    expect(nav.addEventListener).not.toHaveBeenCalled()
    await expect(initRouter({ routes, middleware: { global: [] } })).resolves.toBeUndefined()
  })
})

describe('C-71: middleware in step 3', () => {
  it('runs beforeEach, then global in order, then covering sections outermost first', async () => {
    const order = /** @type {string[]} */ ([])
    /** @param {string} name */
    const log = (name) => () => { order.push(name) }
    guard(log('beforeEach'))
    const nav = await start({
      global: [log('g1'), log('g2')],
      sections: {
        '/admin/users': [log('admin/users')],
        '/administrator': [log('administrator')],
        '/': [log('root')],
        '/admin': [log('admin-a'), log('admin-b')],
      },
    })
    expect(order).toEqual(['beforeEach', 'g1', 'g2', 'root'])
    order.length = 0
    await go('/admin/users/7')
    await nav.idle()
    expect(order).toEqual(['beforeEach', 'g1', 'g2', 'root', 'admin-a', 'admin-b', 'admin/users'])
  })

  it('every guard gets { from, to } base-relative', async () => {
    const seen = vi.fn()
    const nav = await start({ global: [seen], sections: { '/admin': [seen] } }, { base: '/app/' }, '/app/')
    seen.mockClear()
    await go('/admin')
    await nav.idle()
    expect(seen.mock.calls).toEqual([[{ from: '/', to: '/admin' }], [{ from: '/', to: '/admin' }]])
  })

  it('a section false rolls back to the page on screen; later guards do not run', async () => {
    const later = vi.fn()
    const nav = await start({ sections: { '/admin': [() => false, later] } }, {}, '/login')
    const a = vi.fn()
    after(a)
    await go('/admin/users/1')
    await nav.idle()
    expect(later).not.toHaveBeenCalled()
    expect(nav.traverseTo).toHaveBeenCalledTimes(1)
    expect(window.location.pathname).toBe('/login')
    expect(useRoute().path()).toBe('/login')
    expect(a).not.toHaveBeenCalled()
  })

  it('a section redirect follows the redirect rules and fires hooks for the target', async () => {
    const nav = await start({ sections: { '/admin': [({ to }) => `/login?next=${to}`] } })
    const a = vi.fn()
    after(a)
    await go('/admin')
    await nav.idle()
    expect(useRoute().path()).toBe('/login')
    expect(window.location.search).toBe('?next=/admin')
    expect(a.mock.calls).toEqual([[{ from: '/', to: '/login', status: 'ready' }]])
  })

  it('a section redirect on the initial load rewrites the URL', async () => {
    await start({ sections: { '/admin': [({ to }) => (to === '/login' ? undefined : '/login')] } }, {}, '/admin/users/3')
    expect(window.location.pathname).toBe('/login')
    expect(useRoute().path()).toBe('/login')
  })

  it('a section redirect cycle hits the cap (C-27)', async () => {
    const onErr = vi.fn()
    onError(onErr)
    const nav = await start({ sections: { '/admin': [() => '/administrator'], '/administrator': [() => '/admin'] } })
    await go('/admin')
    await nav.idle()
    expect(useRoute().status()).toBe('error')
    expect(onErr).toHaveBeenCalledWith(expect.objectContaining({ phase: 'guard', error: expect.objectContaining({ message: 'Too many redirects (10) from "/admin".' }) }))
  })

  it('a path that matches no route runs global middleware only', async () => {
    const global = vi.fn()
    const root = vi.fn()
    const nav = await start({ global: [global], sections: { '/': [root] } })
    global.mockClear()
    root.mockClear()
    await go('/nope/deep')
    await nav.idle()
    expect(global).toHaveBeenCalledTimes(1)
    expect(root).not.toHaveBeenCalled()
    expect(useRoute().status()).toBe('not-found')
  })

  it('matching for step 3 loads nothing', async () => {
    const loader = vi.fn(ok)
    const seen = /** @type {number[]} */ ([])
    installNavigation()
    setLocation('/')
    await initRouter({ routes: { '/': ok, '/admin': loader }, middleware: { sections: { '/admin': [() => { seen.push(loader.mock.calls.length) }] } } })
    await go('/admin')
    expect(seen).toEqual([0])
    expect(loader).toHaveBeenCalledTimes(1)
  })

  it('a throwing middleware is a guard error reported to onError', async () => {
    const onErr = vi.fn()
    onError(onErr)
    const boom = new Error('mw')
    const nav = await start({ global: [({ to }) => { if (to === '/admin') throw boom }] })
    await go('/admin')
    await nav.idle()
    expect(useRoute().status()).toBe('error')
    expect(onErr).toHaveBeenCalledWith({ error: boom, from: '/', to: '/admin', phase: 'guard' })
  })

  it('an async middleware is awaited; a superseded navigation calls no further guards', async () => {
    /** @type {(v?: unknown) => void} */
    let release = () => {}
    const second = vi.fn()
    const nav = await start({ sections: { '/admin': [() => new Promise((r) => { release = r }), second] } })
    const a = vi.fn()
    after(a)
    nav.navigate('/admin')
    await Promise.resolve()
    nav.navigate('/login')
    release()
    await nav.idle()
    expect(second).not.toHaveBeenCalled()
    expect(useRoute().path()).toBe('/login')
  })

  it('a beforeEach false stops before any middleware', async () => {
    const mw = vi.fn()
    const nav = await start({ global: [mw] })
    mw.mockClear()
    guard(() => false)
    await go('/admin')
    await nav.idle()
    expect(mw).not.toHaveBeenCalled()
  })
})

describe('C-72: destroy() clears middleware', () => {
  it('after destroy() and re-init without middleware the old guards do not run', async () => {
    const mw = vi.fn()
    await start({ global: [mw], sections: { '/': [mw] } })
    expect(mw).toHaveBeenCalledTimes(2)
    destroy()
    mw.mockClear()
    const nav = installNavigation()
    await initRouter({ routes })
    await go('/admin')
    await nav.idle()
    expect(mw).not.toHaveBeenCalled()
  })

  it('a later edit of the passed arrays does not add guards', async () => {
    const mw = vi.fn()
    /** @type {import('../src/types.js').NavigationGuard[]} */
    const global = []
    const nav = await start({ global })
    global.push(mw)
    await go('/admin')
    await nav.idle()
    expect(mw).not.toHaveBeenCalled()
  })
})

import { describe, it, expect, vi, afterEach } from 'vitest'
import { useRoute, useRouter } from '../src/route.js'
import { routerState } from '../src/state.js'
import { go } from '../src/router.js'

afterEach(() => {
  vi.unstubAllGlobals()
  Object.assign(routerState, { path: '', params: {}, status: 'idle', meta: {} })
})

describe('useRoute', () => {
  it('reads path, params, status and meta from the live router state', () => {
    Object.assign(routerState, { path: '/users/42', params: { id: '42' }, status: 'ready', meta: { title: 'Dashboard', layout: 'menu' } })
    const route = useRoute()
    expect(route.path()).toBe('/users/42')
    expect(route.params()).toEqual({ id: '42' })
    expect(route.status()).toBe('ready')
    expect(route.meta()).toEqual({ title: 'Dashboard', layout: 'menu' })
  })

  it('path() is "" before initRouter()', () => {
    expect(useRoute().path()).toBe('')
    expect(useRoute().status()).toBe('idle')
  })
})

describe('useRouter (C-61)', () => {
  it('go is the router go', () => {
    expect(useRouter().go).toBe(go)
  })

  it('back() and forward() resolve on finished and swallow AbortError', async () => {
    const abort = Object.assign(new Error('aborted'), { name: 'AbortError' })
    const nav = {
      back: vi.fn(() => ({ committed: Promise.resolve(), finished: Promise.reject(abort) })),
      forward: vi.fn(() => ({ committed: Promise.resolve(), finished: Promise.resolve() })),
    }
    vi.stubGlobal('navigation', nav)
    await expect(useRouter().back()).resolves.toBeUndefined()
    await expect(useRouter().forward()).resolves.toBeUndefined()
    expect(nav.back).toHaveBeenCalledTimes(1)
    expect(nav.forward).toHaveBeenCalledTimes(1)
  })

  it('back() rethrows other errors', async () => {
    const err = Object.assign(new Error('no entry'), { name: 'InvalidStateError' })
    vi.stubGlobal('navigation', { back: () => ({ committed: Promise.reject(err), finished: Promise.reject(err) }) })
    await expect(useRouter().back()).rejects.toThrow('no entry')
  })
})

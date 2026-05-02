import { describe, it, expect, beforeEach } from 'vitest'
import { useRoute } from '../../src/composables/useRoute.js'
import { routerState } from '../../src/state/routerState.js'

beforeEach(() => {
  routerState.path = '/'
  routerState.params = {}
  routerState.status = 'idle'
  routerState.meta = {}
})

describe('useRoute', () => {
  it('path() returns the current router path', () => {
    routerState.path = '/users'
    expect(useRoute().path()).toBe('/users')
  })

  it('params() returns the current route params', () => {
    routerState.params = { id: '42' }
    expect(useRoute().params()).toEqual({ id: '42' })
  })

  it('status() returns the current router status', () => {
    routerState.status = 'ready'
    expect(useRoute().status()).toBe('ready')
  })

  it('meta() returns the current page meta object', () => {
    routerState.meta = { title: 'Dashboard', layout: 'menu' }
    expect(useRoute().meta()).toEqual({ title: 'Dashboard', layout: 'menu' })
  })

  it('each call to useRoute() returns a fresh object reflecting live state', () => {
    routerState.path = '/users'
    const route = useRoute()
    routerState.path = '/login'
    expect(route.path()).toBe('/login')
  })
})

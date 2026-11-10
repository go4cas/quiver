import { describe, it, expect } from 'vitest'
import { hmrState } from '../hmrState.js'

describe('hmrState()', () => {
  it('returns a reactive copy of the initial state when import.meta.hot is absent', () => {
    const state = hmrState('counter', { count: 1 })
    state.count++
    expect(state.count).toBe(2)
    expect(typeof (/** @type {any} */ (state).$on)).toBe('function')
  })

  it('gives each call its own object outside Vite (no-build, Bun)', () => {
    const a = hmrState('same-key', { n: 0 })
    const b = hmrState('same-key', { n: 0 })
    a.n = 5
    expect(b.n).toBe(0)
  })
})

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { html, nextTick } from '@arrow-js/core'
import { useMediaQuery } from '../src/useMediaQuery.js'
import { mountInComponent } from './helpers/mount.js'

// jsdom has no matchMedia, so each test installs a controllable fake.
/** @type {{ query: string, matches: boolean, listeners: Set<(e: any) => void>, addEventListener: any, removeEventListener: any }[]} */
let lists

/** @param {boolean} matches */
function change(matches) {
  for (const list of lists) {
    list.matches = matches
    for (const fn of list.listeners) fn({ matches, media: list.query })
  }
}

beforeEach(() => {
  lists = []
  vi.stubGlobal('matchMedia', vi.fn((query) => {
    const listeners = new Set()
    const list = {
      query,
      matches: false,
      listeners,
      addEventListener: vi.fn((type, fn) => type === 'change' && listeners.add(fn)),
      removeEventListener: vi.fn((type, fn) => type === 'change' && listeners.delete(fn)),
    }
    lists.push(list)
    return list
  }))
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('useMediaQuery', () => {
  it('reads the current match for the query', () => {
    const m = useMediaQuery('(prefers-color-scheme: dark)')
    expect(matchMedia).toHaveBeenCalledWith('(prefers-color-scheme: dark)')
    expect(m.matches()).toBe(false)
  })

  it('follows changes reactively', async () => {
    const m = useMediaQuery('(min-width: 40rem)')
    const root = document.createElement('div')
    html`${() => (m.matches() ? 'wide' : 'narrow')}`(root)
    expect(root.textContent).toBe('narrow')
    change(true)
    await nextTick()
    expect(m.matches()).toBe(true)
    expect(root.textContent).toBe('wide')
  })

  it('outside a component: stop() removes the listener, is idempotent, and keeps the last value', () => {
    const m = useMediaQuery('(min-width: 40rem)')
    change(true)
    m.stop()
    m.stop()
    expect(lists[0].listeners.size).toBe(0)
    change(false)
    expect(m.matches()).toBe(true)
  })

  it('inside a component: unmounting removes the listener without calling stop()', async () => {
    const { result: m, unmount } = mountInComponent(() => useMediaQuery('(min-width: 40rem)'))
    expect(lists[0].listeners.size).toBe(1)
    await unmount()
    expect(lists[0].listeners.size).toBe(0)
    change(true)
    expect(m.matches()).toBe(false)
  })
})

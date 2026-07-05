import { describe, it, expect, beforeEach } from 'vitest'
import { reactive, nextTick } from '@arrow-js/core'
import { useMeta, clearMeta } from '../../src/framework/meta.js'

beforeEach(() => {
  clearMeta()
  document.title = ''
  document.querySelector('meta[name="description"]')?.remove()
})

describe('useMeta — static values', () => {
  it('sets a static title once', () => {
    useMeta({ title: 'My Page' })
    expect(document.title).toBe('My Page')
  })

  it('creates and fills the description meta tag', () => {
    useMeta({ description: 'A page.' })
    const tag = document.querySelector('meta[name="description"]')
    expect(tag?.getAttribute('content')).toBe('A page.')
  })
})

describe('useMeta — reactive values', () => {
  it('a function title updates when its state changes', async () => {
    const state = reactive({ count: 1 })
    useMeta({ title: () => `Count ${state.count}` })
    expect(document.title).toBe('Count 1')

    state.count = 2
    await nextTick()
    expect(document.title).toBe('Count 2')
  })

  it('clearMeta stops reactive watchers', async () => {
    const state = reactive({ count: 1 })
    useMeta({ title: () => `Count ${state.count}` })
    expect(document.title).toBe('Count 1')

    clearMeta()
    state.count = 99
    await nextTick()
    expect(document.title).toBe('Count 1') // watcher no longer fires
  })

  it('a new useMeta call replaces the previous page watchers', async () => {
    const state = reactive({ count: 1 })
    useMeta({ title: () => `Old ${state.count}` })
    useMeta({ title: 'New Page' })

    state.count = 2
    await nextTick()
    expect(document.title).toBe('New Page') // old watcher was stopped
  })
})

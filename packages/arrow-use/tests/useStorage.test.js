import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { html, nextTick } from '@arrow-js/core'
import { useStorage } from '../src/useStorage.js'
import { mountInComponent } from './helpers/mount.js'

/** Another tab writing the key: jsdom does not fire 'storage' across documents. */
function otherTab(key, newValue, area = localStorage) {
  if (newValue === null) area.removeItem(key)
  else area.setItem(key, newValue)
  window.dispatchEvent(new StorageEvent('storage', { key, newValue, storageArea: area }))
}

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('useStorage: reading and writing', () => {
  it('returns initial when the key is unset, and does not write it', () => {
    const s = useStorage('theme', 'light')
    expect(s.value()).toBe('light')
    expect(localStorage.getItem('theme')).toBeNull()
  })

  it('reads an existing value as JSON', () => {
    localStorage.setItem('prefs', JSON.stringify({ dense: true }))
    expect(useStorage('prefs', { dense: false }).value()).toEqual({ dense: true })
  })

  it('set() writes JSON and updates value()', () => {
    const s = useStorage('count', 0)
    s.set(3)
    expect(s.value()).toBe(3)
    expect(localStorage.getItem('count')).toBe('3')
  })

  it('remove() deletes the key and goes back to initial', () => {
    const s = useStorage('count', 0)
    s.set(3)
    s.remove()
    expect(s.value()).toBe(0)
    expect(localStorage.getItem('count')).toBeNull()
  })

  it('falls back to initial when the stored value does not parse', () => {
    localStorage.setItem('count', '{oops')
    expect(useStorage('count', 7).value()).toBe(7)
  })

  it("uses sessionStorage with storage: 'session'", () => {
    const s = useStorage('tab', 'a', { storage: 'session' })
    s.set('b')
    expect(sessionStorage.getItem('tab')).toBe('"b"')
    expect(localStorage.getItem('tab')).toBeNull()
  })

  it('uses a custom serializer', () => {
    localStorage.setItem('ids', '1,2')
    const s = useStorage('ids', /** @type {number[]} */ ([]), {
      serializer: { read: (raw) => raw.split(',').map(Number), write: (v) => v.join(',') },
    })
    expect(s.value()).toEqual([1, 2])
    s.set([3, 4])
    expect(localStorage.getItem('ids')).toBe('3,4')
  })

  it('returns the stored value itself, not a reactive proxy (U-6)', () => {
    const s = useStorage('obj', { a: 1 })
    const next = { a: 2 }
    s.set(next)
    expect(s.value()).toBe(next)
  })

  it('is reactive: a template re-renders on set()', async () => {
    const s = useStorage('count', 0)
    const root = document.createElement('div')
    html`${() => s.value()}`(root)
    expect(root.textContent).toBe('0')
    s.set(5)
    await nextTick()
    expect(root.textContent).toBe('5')
  })
})

describe('useStorage: storage that throws falls back to memory', () => {
  it('when setItem throws (quota, private mode)', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError')
    })
    const s = useStorage('count', 0)
    s.set(2)
    expect(s.value()).toBe(2)
  })

  it('when reading the storage area itself throws (blocked storage)', () => {
    vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError')
    })
    const s = useStorage('count', 0)
    expect(s.value()).toBe(0)
    s.set(4)
    expect(s.value()).toBe(4)
    s.remove()
    expect(s.value()).toBe(0)
  })
})

describe('useStorage: syncing across tabs', () => {
  it('follows another tab writing, removing and clearing the key', () => {
    const s = useStorage('count', 0)
    otherTab('count', '9')
    expect(s.value()).toBe(9)
    otherTab('count', null)
    expect(s.value()).toBe(0)
    s.set(1)
    localStorage.clear()
    window.dispatchEvent(new StorageEvent('storage', { key: null, newValue: null, storageArea: localStorage }))
    expect(s.value()).toBe(0)
  })

  it('ignores other keys and the other storage area', () => {
    const s = useStorage('count', 0)
    otherTab('other', '9')
    otherTab('count', '9', sessionStorage)
    expect(s.value()).toBe(0)
  })

  it('outside a component: stop() stops syncing, is idempotent, and keeps the last value', () => {
    const s = useStorage('count', 0)
    otherTab('count', '1')
    s.stop()
    s.stop()
    otherTab('count', '2')
    expect(s.value()).toBe(1)
  })

  it('inside a component: unmounting stops syncing without calling stop()', async () => {
    const { result: s, unmount } = mountInComponent(() => useStorage('count', 0))
    otherTab('count', '1')
    expect(s.value()).toBe(1)
    await unmount()
    otherTab('count', '2')
    expect(s.value()).toBe(1)
  })
})

describe('useStorage: construction only reads (N130)', () => {
  it.each(['local', 'session'])('%sStorage: creating it writes nothing and keeps unrelated keys', (which) => {
    const area = which === 'local' ? localStorage : sessionStorage
    area.setItem('__arrow-use__', 'app data')
    area.setItem('other', 'x')
    const setItem = vi.spyOn(Storage.prototype, 'setItem')
    const removeItem = vi.spyOn(Storage.prototype, 'removeItem')
    const clear = vi.spyOn(Storage.prototype, 'clear')
    const s = useStorage('count', 0, { storage: /** @type {'local' | 'session'} */ (which) })
    expect(s.value()).toBe(0)
    expect(setItem).not.toHaveBeenCalled()
    expect(removeItem).not.toHaveBeenCalled()
    expect(clear).not.toHaveBeenCalled()
    expect(area.getItem('__arrow-use__')).toBe('app data')
    expect(area.getItem('other')).toBe('x')
  })

  it.each(['local', 'session'])('%sStorage: loads a stored value when writes fail', (which) => {
    const area = which === 'local' ? localStorage : sessionStorage
    area.setItem('prefs', JSON.stringify({ dense: true }))
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('read-only', 'QuotaExceededError')
    })
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new DOMException('read-only', 'SecurityError')
    })
    const s = useStorage('prefs', { dense: false }, { storage: /** @type {'local' | 'session'} */ (which) })
    expect(s.value()).toEqual({ dense: true })
    s.set({ dense: false })
    expect(s.value()).toEqual({ dense: false })
    expect(area.getItem('prefs')).toBe('{"dense":true}')
    s.remove()
    expect(s.value()).toEqual({ dense: false })
  })

  it('when getItem throws, value() is initial and set()/remove() still write', () => {
    localStorage.setItem('count', '5')
    const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('denied', 'SecurityError')
    })
    const s = useStorage('count', 0)
    expect(s.value()).toBe(0)
    getItem.mockRestore()
    s.set(2)
    expect(localStorage.getItem('count')).toBe('2')
    s.remove()
    expect(localStorage.getItem('count')).toBeNull()
  })

  it('after a failed local write, another tab writing the key still updates value()', () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError')
    })
    const s = useStorage('count', 0)
    s.set(3)
    expect(s.value()).toBe(3)
    setItem.mockRestore()
    otherTab('count', '8')
    expect(s.value()).toBe(8)
  })

  it('without a storage area at all, the value lives in memory', () => {
    vi.stubGlobal('localStorage', undefined)
    const s = useStorage('count', 0)
    s.set(6)
    expect(s.value()).toBe(6)
    s.remove()
    expect(s.value()).toBe(0)
  })
})

// @vitest-environment node
// TECH-SPEC U-3, U-4, U-5 (outside): no window, document, localStorage or
// matchMedia. Importing does nothing, and each composable returns its full
// shape with the documented no-browser defaults.
import { describe, it, expect, vi } from 'vitest'

describe('no browser (U-3, U-4)', () => {
  it('runs in an environment without browser globals', () => {
    for (const name of ['window', 'document', 'localStorage', 'sessionStorage', 'matchMedia']) {
      expect(name in globalThis, name).toBe(false)
    }
  })

  it('imports src/index.js without throwing (U-3)', async () => {
    const mod = await import('../src/index.js')
    expect(Object.keys(mod).sort()).toEqual(['useEventListener', 'useFetch', 'useMediaQuery', 'useStorage'])
  })

  it('useFetch: data() null, loading() false, and no request without fetch', async () => {
    const { useFetch } = await import('../src/index.js')
    vi.stubGlobal('fetch', undefined)
    try {
      const f = useFetch('/api')
      expect(f.data()).toBeNull()
      expect(f.loading()).toBe(false)
      expect(f.error()).toBeNull()
      expect(f.status()).toBeNull()
      await expect(f.refetch()).resolves.toBeUndefined()
      expect(f.loading()).toBe(false)
      f.reset()
      f.stop()
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it('useStorage: value() is initial and set() updates it in memory', async () => {
    const { useStorage } = await import('../src/index.js')
    const s = useStorage('k', 1)
    expect(s.value()).toBe(1)
    s.set(2)
    expect(s.value()).toBe(2)
    s.remove()
    expect(s.value()).toBe(1)
    s.stop()
  })

  it('useMediaQuery: matches() is false', async () => {
    const { useMediaQuery } = await import('../src/index.js')
    const m = useMediaQuery('(min-width: 1px)')
    expect(m.matches()).toBe(false)
    m.stop()
  })

  it('useEventListener: no listener, stop() is a no-op, even for () => window', async () => {
    const { useEventListener } = await import('../src/index.js')
    // @ts-expect-error window does not exist here, which is the point
    const { stop } = useEventListener(() => window, 'resize', () => {})
    expect(() => stop()).not.toThrow()
  })
})

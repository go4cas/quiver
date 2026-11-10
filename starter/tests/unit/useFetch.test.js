import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// onCleanup requires a component context; stub it out for the test environment.
// Abort-on-cleanup behaviour is verified via the refetch abort test.
vi.mock('@arrow-js/core', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, onCleanup: vi.fn() }
})

import { useFetch } from '../../src/composables/useFetch.js'

function mockFetch(body, { status = 200, delay = 0 } = {}) {
  return vi.fn(() =>
    new Promise((resolve) =>
      setTimeout(
        () =>
          resolve({
            ok: status >= 200 && status < 300,
            status,
            json: () => Promise.resolve(body),
          }),
        delay,
      ),
    ),
  )
}

function mockFetchError(message) {
  return vi.fn(() => Promise.reject(new Error(message)))
}

beforeEach(() => {
  vi.stubGlobal('fetch', mockFetch({ id: 1, title: 'Hello' }))
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('useFetch — initial state', () => {
  it('starts with null data, false loading, null error, null status when immediate is false', () => {
    const f = useFetch('/api/test', { immediate: false })
    expect(f.data()).toBeNull()
    expect(f.loading()).toBe(false)
    expect(f.error()).toBeNull()
    expect(f.status()).toBeNull()
  })
})

describe('useFetch — successful fetch', () => {
  it('sets data and status 200, clears loading and error', async () => {
    const f = useFetch('/api/test')
    expect(f.loading()).toBe(true)
    await vi.waitFor(() => expect(f.loading()).toBe(false))
    expect(f.data()).toEqual({ id: 1, title: 'Hello' })
    expect(f.error()).toBeNull()
    expect(f.status()).toBe(200)
  })

  it('applies transform to the parsed response', async () => {
    vi.stubGlobal('fetch', mockFetch([{ id: 1 }, { id: 2 }]))
    const f = useFetch('/api/items', { transform: (d) => d.map((x) => x.id) })
    await vi.waitFor(() => expect(f.loading()).toBe(false))
    expect(f.data()).toEqual([1, 2])
  })
})

describe('useFetch — error states', () => {
  it('sets error for HTTP 404, keeps data null', async () => {
    vi.stubGlobal('fetch', mockFetch({}, { status: 404 }))
    const f = useFetch('/api/missing')
    await vi.waitFor(() => expect(f.loading()).toBe(false))
    expect(f.error()).toBe('HTTP 404')
    expect(f.data()).toBeNull()
    expect(f.status()).toBe(404)
  })

  it('sets error on network failure', async () => {
    vi.stubGlobal('fetch', mockFetchError('Failed to fetch'))
    const f = useFetch('/api/offline')
    await vi.waitFor(() => expect(f.loading()).toBe(false))
    expect(f.error()).toBe('Failed to fetch')
    expect(f.data()).toBeNull()
  })

  it('clears a previous error on refetch success', async () => {
    vi.stubGlobal('fetch', mockFetch({}, { status: 500 }))
    const f = useFetch('/api/flaky')
    await vi.waitFor(() => expect(f.loading()).toBe(false))
    expect(f.error()).toBe('HTTP 500')

    vi.stubGlobal('fetch', mockFetch({ ok: true }))
    await f.refetch()
    expect(f.error()).toBeNull()
    expect(f.data()).toEqual({ ok: true })
  })
})

describe('useFetch — immediate option', () => {
  it('does not call fetch when immediate is false', () => {
    const spy = mockFetch({})
    vi.stubGlobal('fetch', spy)
    useFetch('/api/test', { immediate: false })
    expect(spy).not.toHaveBeenCalled()
  })

  it('calls fetch when immediate is true (default)', () => {
    const spy = mockFetch({})
    vi.stubGlobal('fetch', spy)
    useFetch('/api/test')
    expect(spy).toHaveBeenCalledOnce()
  })
})

describe('useFetch — refetch', () => {
  it('re-calls fetch and updates data', async () => {
    const spy = mockFetch({ count: 1 })
    vi.stubGlobal('fetch', spy)
    const f = useFetch('/api/count')
    await vi.waitFor(() => expect(f.loading()).toBe(false))
    expect(spy).toHaveBeenCalledTimes(1)

    vi.stubGlobal('fetch', mockFetch({ count: 2 }))
    await f.refetch()
    expect(f.data()).toEqual({ count: 2 })
  })
})

describe('useFetch — stale requests', () => {
  it('keeps loading true when an aborted request settles while a newer one is in flight', async () => {
    const calls = []
    const slowFetch = vi.fn((_url, options) =>
      new Promise((resolve, reject) => {
        const i = calls.length
        calls.push(() => resolve({ ok: true, status: 200, json: () => Promise.resolve({ call: i }) }))
        options?.signal?.addEventListener('abort', () => {
          const err = new Error('aborted')
          err.name = 'AbortError'
          reject(err)
        })
      })
    )
    vi.stubGlobal('fetch', slowFetch)

    const f = useFetch('/api/slow')
    f.refetch() // aborts request 0; its rejection settles while request 1 is pending
    await new Promise((r) => setTimeout(r, 0))
    expect(f.loading()).toBe(true) // the stale request must not clear loading

    calls[1]()
    await vi.waitFor(() => expect(f.loading()).toBe(false))
    expect(f.data()).toEqual({ call: 1 })
  })

  it('reset() aborts an in-flight request and clears loading', () => {
    const abortSpy = vi.fn()
    const slowFetch = vi.fn((_url, options) => {
      options?.signal?.addEventListener('abort', abortSpy)
      return new Promise(() => {})
    })
    vi.stubGlobal('fetch', slowFetch)

    const f = useFetch('/api/slow')
    expect(f.loading()).toBe(true)
    f.reset()
    expect(abortSpy).toHaveBeenCalledOnce()
    expect(f.loading()).toBe(false)
  })

  it('honours a caller-supplied abort signal', async () => {
    const userController = new AbortController()
    const slowFetch = vi.fn((_url, options) =>
      new Promise((_resolve, reject) => {
        options.signal.addEventListener('abort', () => {
          const err = new Error('aborted')
          err.name = 'AbortError'
          reject(err)
        })
      })
    )
    vi.stubGlobal('fetch', slowFetch)

    const f = useFetch('/api/slow', { signal: userController.signal })
    expect(f.loading()).toBe(true)
    userController.abort()
    await vi.waitFor(() => expect(f.loading()).toBe(false))
    expect(f.error()).toBeNull()
  })
})

describe('useFetch — abort', () => {
  it('aborts the previous request when refetch is called before it resolves', async () => {
    const abortSpy = vi.fn()
    const slowFetch = vi.fn((_url, options) => {
      options?.signal?.addEventListener('abort', abortSpy)
      return new Promise((resolve) =>
        setTimeout(
          () => resolve({ ok: true, status: 200, json: () => Promise.resolve({}) }),
          100,
        ),
      )
    })
    vi.stubGlobal('fetch', slowFetch)
    const f = useFetch('/api/slow')
    // Immediately trigger a second fetch before the first resolves
    f.refetch()
    await vi.waitFor(() => expect(f.loading()).toBe(false))
    expect(abortSpy).toHaveBeenCalledOnce()
  })
})

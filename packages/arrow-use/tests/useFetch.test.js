import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useFetch } from '../src/useFetch.js'
import { mountInComponent } from './helpers/mount.js'

// Ported from the 2.x starter's tests/unit/useFetch.test.js, now against bare
// @arrow-js/core with no mocks of Arrow itself, plus stop() and U-5.

function mockFetch(body, { status = 200, delay = 0 } = {}) {
  return vi.fn(() =>
    new Promise((resolve) =>
      setTimeout(
        () => resolve({ ok: status >= 200 && status < 300, status, json: () => Promise.resolve(body) }),
        delay,
      ),
    ),
  )
}

/** A fetch that never resolves and records each request's abort. */
function hangingFetch() {
  const aborted = vi.fn()
  const fn = vi.fn((_url, options) => {
    options?.signal?.addEventListener('abort', aborted)
    return new Promise((_resolve, reject) => {
      options?.signal?.addEventListener('abort', () => {
        const err = new Error('aborted')
        err.name = 'AbortError'
        reject(err)
      })
    })
  })
  return Object.assign(fn, { aborted })
}

beforeEach(() => {
  vi.stubGlobal('fetch', mockFetch({ id: 1, title: 'Hello' }))
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('useFetch: initial state', () => {
  it('starts with null data, false loading, null error, null status when immediate is false', () => {
    const f = useFetch('/api/test', { immediate: false })
    expect(f.data()).toBeNull()
    expect(f.loading()).toBe(false)
    expect(f.error()).toBeNull()
    expect(f.status()).toBeNull()
  })
})

describe('useFetch: successful fetch', () => {
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

  it('returns the parsed value itself, not a reactive proxy of it (U-6)', async () => {
    const body = { id: 1 }
    vi.stubGlobal('fetch', mockFetch(body))
    const f = useFetch('/api/test')
    await vi.waitFor(() => expect(f.loading()).toBe(false))
    expect(f.data()).toBe(body)
  })

  it('passes fetch options through, without immediate and transform', async () => {
    const spy = mockFetch({})
    vi.stubGlobal('fetch', spy)
    useFetch('/api/test', { method: 'POST', headers: { a: 'b' }, transform: (x) => x })
    const [url, init] = spy.mock.calls[0]
    expect(url).toBe('/api/test')
    expect(init).toMatchObject({ method: 'POST', headers: { a: 'b' } })
    expect(init).not.toHaveProperty('transform')
    expect(init).not.toHaveProperty('immediate')
    expect(init.signal).toBeInstanceOf(AbortSignal)
  })
})

describe('useFetch: error states', () => {
  it('sets error for HTTP 404, keeps data null', async () => {
    vi.stubGlobal('fetch', mockFetch({}, { status: 404 }))
    const f = useFetch('/api/missing')
    await vi.waitFor(() => expect(f.loading()).toBe(false))
    expect(f.error()).toBe('HTTP 404')
    expect(f.data()).toBeNull()
    expect(f.status()).toBe(404)
  })

  it('sets error on network failure', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('Failed to fetch'))))
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

describe('useFetch: immediate option', () => {
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

describe('useFetch: refetch, reset, supersession', () => {
  it('refetch re-calls fetch and updates data', async () => {
    const f = useFetch('/api/count')
    await vi.waitFor(() => expect(f.loading()).toBe(false))
    vi.stubGlobal('fetch', mockFetch({ count: 2 }))
    await f.refetch()
    expect(f.data()).toEqual({ count: 2 })
  })

  it('refetch aborts the previous request before it resolves', async () => {
    const slow = hangingFetch()
    vi.stubGlobal('fetch', slow)
    const f = useFetch('/api/slow')
    f.refetch()
    expect(slow.aborted).toHaveBeenCalledOnce()
    expect(slow).toHaveBeenCalledTimes(2)
  })

  it('keeps loading true when an aborted request settles while a newer one is in flight', async () => {
    /** @type {(() => void)[]} */
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
      }),
    )
    vi.stubGlobal('fetch', slowFetch)

    const f = useFetch('/api/slow')
    f.refetch() // aborts request 0; its rejection settles while request 1 is pending
    await new Promise((r) => setTimeout(r, 0))
    expect(f.loading()).toBe(true)

    calls[1]()
    await vi.waitFor(() => expect(f.loading()).toBe(false))
    expect(f.data()).toEqual({ call: 1 })
  })

  it('a superseded response that ignores the abort never writes its result', async () => {
    let n = 0
    vi.stubGlobal('fetch', vi.fn(() => {
      const call = n++
      return new Promise((resolve) =>
        setTimeout(() => resolve({ ok: true, status: 200 + call, json: () => Promise.resolve({ call }) }), call === 0 ? 30 : 0),
      )
    }))
    const f = useFetch('/api/race')
    await f.refetch()
    expect(f.data()).toEqual({ call: 1 })
    await new Promise((r) => setTimeout(r, 50))
    expect(f.data()).toEqual({ call: 1 })
    expect(f.status()).toBe(201)
  })

  it('reset() aborts an in-flight request and clears every value', async () => {
    const f = useFetch('/api/test')
    await vi.waitFor(() => expect(f.loading()).toBe(false))
    const slow = hangingFetch()
    vi.stubGlobal('fetch', slow)
    f.refetch()
    f.reset()
    expect(slow.aborted).toHaveBeenCalledOnce()
    expect(f.loading()).toBe(false)
    expect(f.data()).toBeNull()
    expect(f.status()).toBeNull()
    expect(f.error()).toBeNull()
  })

  it('honours a caller-supplied abort signal', async () => {
    const user = new AbortController()
    vi.stubGlobal('fetch', hangingFetch())
    const f = useFetch('/api/slow', { signal: user.signal })
    expect(f.loading()).toBe(true)
    user.abort()
    await vi.waitFor(() => expect(f.loading()).toBe(false))
    expect(f.error()).toBeNull()
  })
})

describe('useFetch: stop() (U-5, U-6)', () => {
  it('outside a component: stop() aborts the request and ignores later refetch()', async () => {
    const slow = hangingFetch()
    vi.stubGlobal('fetch', slow)
    const f = useFetch('/api/slow')
    f.stop()
    expect(slow.aborted).toHaveBeenCalledOnce()
    expect(f.loading()).toBe(false)
    await f.refetch()
    expect(slow).toHaveBeenCalledOnce()
  })

  it('is idempotent and leaves the getters on their last values', async () => {
    const f = useFetch('/api/test')
    await vi.waitFor(() => expect(f.loading()).toBe(false))
    f.stop()
    f.stop()
    expect(f.data()).toEqual({ id: 1, title: 'Hello' })
    expect(f.status()).toBe(200)
  })

  it('inside a component: unmounting aborts the request without calling stop()', async () => {
    const slow = hangingFetch()
    vi.stubGlobal('fetch', slow)
    const { result: f, unmount } = mountInComponent(() => useFetch('/api/slow'))
    expect(f.loading()).toBe(true)
    await unmount()
    expect(slow.aborted).toHaveBeenCalledOnce()
    expect(f.loading()).toBe(false)
  })
})

import { reactive, onCleanup } from '@arrow-js/core'

/**
 * @typedef {{ immediate?: boolean, transform?: (raw: any) => any } & RequestInit} UseFetchOptions
 *   `immediate` (default `true`) starts the request at once; `transform` (default none)
 *   maps the parsed JSON before it reaches `data()`. Everything else is passed to `fetch`.
 */

/**
 * @typedef {object} UseFetchReturn
 * @property {() => any} data  parsed (and transformed) JSON of the last successful response, else `null`
 * @property {() => boolean} loading  `true` while the current request is in flight
 * @property {() => string | null} error  message of the last failure (`'HTTP 404'`, a network error), else `null`
 * @property {() => number | null} status  HTTP status of the last response, else `null`
 * @property {() => Promise<void>} refetch  starts a new request, aborting the one in flight; does nothing after `stop()`
 * @property {() => void} reset  aborts the request in flight and clears every value
 * @property {() => void} stop  aborts the request in flight and ignores later `refetch()` calls; idempotent
 */

/**
 * Reactive JSON fetching. `refetch()` aborts the previous in-flight request, and a
 * superseded request never writes its result. Inside a `component()`, the request
 * is aborted when the component unmounts.
 *
 * With no global `fetch` (a non-browser runtime), nothing is requested and the
 * getters keep their initial values.
 *
 * @param {string} url
 * @param {UseFetchOptions} [options]
 * @returns {UseFetchReturn}
 */
export function useFetch(url, options = {}) {
  const { immediate = true, transform, ...fetchOptions } = options

  // Only primitives live in reactive state; the data itself is kept raw, so
  // data() returns the parsed value, not a reactive proxy of it (TECH-SPEC U-6).
  const state = reactive(
    /** @type {{ loading: boolean, error: string | null, status: number | null, version: number }} */
    ({ loading: false, error: null, status: null, version: 0 }),
  )
  /** @type {any} */
  let data = null
  /** @type {AbortController | null} */
  let controller = null
  let stopped = false

  /** @param {any} value */
  function setData(value) {
    data = value
    state.version++
  }

  async function execute() {
    if (stopped || typeof fetch !== 'function') return
    if (controller) controller.abort()
    const own = new AbortController()
    controller = own

    state.loading = true
    state.error = null

    try {
      // Combine with a caller-supplied signal so both can abort the request.
      const signal = fetchOptions.signal ? AbortSignal.any([own.signal, fetchOptions.signal]) : own.signal
      const res = await fetch(url, { ...fetchOptions, signal })
      if (controller !== own) return // superseded by a newer refetch, a reset or stop
      state.status = res.status
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const raw = await res.json()
      if (controller !== own) return // superseded while parsing
      setData(transform ? transform(raw) : raw)
    } catch (err) {
      const e = /** @type {Error} */ (err)
      if (controller === own && e.name !== 'AbortError') state.error = e.message
    } finally {
      // Only the current request may touch loading: a stale aborted request
      // must not clear it while a newer one is still in flight.
      if (controller === own) state.loading = false
    }
  }

  function abort() {
    if (controller) {
      controller.abort()
      controller = null
    }
    state.loading = false
  }

  function reset() {
    abort()
    setData(null)
    state.error = null
    state.status = null
  }

  function stop() {
    stopped = true
    abort()
  }

  // onCleanup throws outside a component (U-5).
  try { onCleanup(stop) } catch {}
  if (immediate) execute()

  return {
    data: () => (state.version, data),
    loading: () => state.loading,
    error: () => state.error,
    status: () => state.status,
    refetch: execute,
    reset,
    stop,
  }
}

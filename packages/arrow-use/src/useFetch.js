import { reactive, onCleanup } from '@arrow-js/core'

/**
 * @typedef {{ immediate?: boolean, transform?: (raw: any) => any } & RequestInit} UseFetchOptions
 *   `immediate` (default `true`) starts the request at once; `transform` (default none)
 *   synchronously maps the parsed JSON before it reaches `data()` (a returned promise is
 *   stored as is, not awaited). Everything else is passed to `fetch`.
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
 * Any failure, whatever was thrown, ends up in `error()`; `refetch()` never rejects.
 * An abort, by this composable or by a caller's `signal`, is not an error.
 *
 * Requests use the global `fetch`, so runtimes that have one (Node 18+, Bun, Deno)
 * make real requests too. Without a global `fetch`, nothing is requested and the
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

    /** @type {AbortSignal} */
    let signal = own.signal
    try {
      // Combine with a caller-supplied signal so both can abort the request.
      if (fetchOptions.signal) signal = AbortSignal.any([own.signal, fetchOptions.signal])
      const res = await fetch(url, { ...fetchOptions, signal })
      if (controller !== own) return // superseded by a newer refetch, a reset or stop
      state.status = res.status
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const raw = await res.json()
      if (controller !== own) return // superseded while parsing
      const value = transform ? transform(raw) : raw
      if (controller !== own) return // the transform reset, stopped or refetched
      setData(value)
    } catch (err) {
      // Cancellation is read from the signal, not from the shape of the thrown
      // value: a caller may abort with any reason (N131).
      if (controller === own && !signal.aborted) state.error = errorMessage(err)
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

/**
 * A readable message for anything a request, `res.json()` or `transform` threw.
 * @param {unknown} err
 * @returns {string}
 */
function errorMessage(err) {
  if (typeof err === 'string') return err || 'Request failed'
  const message = err !== null && typeof err === 'object' ? /** @type {{ message?: unknown }} */ (err).message : undefined
  if (typeof message === 'string' && message) return message
  if (err === null || err === undefined || typeof err === 'object') return 'Request failed'
  return String(err)
}

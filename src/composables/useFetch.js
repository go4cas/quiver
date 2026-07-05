import { reactive, onCleanup } from '@arrow-js/core'

/**
 * Reactive HTTP fetching. refetch() aborts the previous in-flight request.
 * @param {string} url
 * @param {{ immediate?: boolean, transform?: (raw: any) => any, delay?: number } & RequestInit} [options]
 * @returns {{
 *   data: () => any,
 *   loading: () => boolean,
 *   error: () => string | null,
 *   status: () => number | null,
 *   refetch: () => Promise<void>,
 *   reset: () => void,
 * }}
 */
export function useFetch(url, options = {}) {
  const { immediate = true, transform, delay = 0, ...fetchOptions } = options

  const state = reactive(
    /** @type {{ data: any, loading: boolean, error: string | null, status: number | null }} */
    ({ data: null, loading: false, error: null, status: null })
  )
  /** @type {AbortController | null} */
  let controller = null

  async function execute() {
    if (controller) controller.abort()
    const own = new AbortController()
    controller = own

    state.loading = true
    state.error   = null

    try {
      // Combine with a caller-supplied signal so both can abort the request.
      const signal = fetchOptions.signal
        ? AbortSignal.any([own.signal, fetchOptions.signal])
        : own.signal
      const res = await fetch(url, { ...fetchOptions, signal })
      if (controller !== own) return // superseded by a newer refetch
      state.status = res.status
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const raw = await res.json()
      if (delay) await new Promise((r) => setTimeout(r, delay))
      if (controller !== own) return
      state.data = transform ? transform(raw) : raw
    } catch (err) {
      const e = /** @type {Error} */ (err)
      if (controller === own && e.name !== 'AbortError') state.error = e.message
    } finally {
      // Only the current request may touch loading — a stale aborted request
      // must not clear it while a newer one is still in flight.
      if (controller === own) state.loading = false
    }
  }

  try { onCleanup(() => controller?.abort()) } catch {}
  if (immediate) execute()

  function reset() {
    if (controller) {
      controller.abort()
      controller = null
    }
    state.data    = null
    state.error   = null
    state.status  = null
    state.loading = false
  }

  return {
    data:    () => state.data,
    loading: () => state.loading,
    error:   () => state.error,
    status:  () => state.status,
    refetch: execute,
    reset,
  }
}

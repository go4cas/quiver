import { reactive, onCleanup } from '@arrow-js/core'

export function useFetch(url, options = {}) {
  const { immediate = true, transform, ...fetchOptions } = options

  const state = reactive({ data: null, loading: false, error: null, status: null })
  let controller = null

  async function execute() {
    if (controller) controller.abort()
    controller = new AbortController()

    state.loading = true
    state.error   = null

    try {
      const res = await fetch(url, { signal: controller.signal, ...fetchOptions })
      state.status = res.status
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const raw = await res.json()
      state.data = transform ? transform(raw) : raw
    } catch (err) {
      if (err.name !== 'AbortError') state.error = err.message
    } finally {
      state.loading = false
    }
  }

  try { onCleanup(() => controller?.abort()) } catch {}
  if (immediate) execute()

  return {
    data:    () => state.data,
    loading: () => state.loading,
    error:   () => state.error,
    status:  () => state.status,
    refetch: execute,
  }
}

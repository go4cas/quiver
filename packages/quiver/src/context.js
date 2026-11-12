/** @type {Map<string, unknown>} */
const _ctx = new Map()

/**
 * Register a value in the app-global context. Last write for a key wins.
 * @param {string} key
 * @param {unknown} value
 * @returns {void}
 */
export const provide = (key, value) => { _ctx.set(key, value) }

/**
 * Read a value from the app-global context.
 * @template [T=unknown]
 * @param {string} key
 * @param {T} [fallback] returned when the key is missing or set to null/undefined
 * @returns {T}
 */
export const inject = (key, fallback) => /** @type {T} */ (_ctx.get(key) ?? fallback)

/** Empty the context. Called by destroy(). */
export const clearContext = () => { _ctx.clear() }

/**
 * provide() that can be undone: the returned function puts the key back as it
 * was, unless something has written or cleared it since (C-74, T22).
 * @param {string} key
 * @param {unknown} value
 * @returns {() => void}
 */
export function provideUndoable(key, value) {
  const had = _ctx.has(key)
  const previous = _ctx.get(key)
  _ctx.set(key, value)
  return () => {
    if (!_ctx.has(key) || _ctx.get(key) !== value) return
    if (had) _ctx.set(key, previous)
    else _ctx.delete(key)
  }
}

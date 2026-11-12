/** @type {Map<string, unknown>} */
const _ctx = new Map()
/**
 * Who wrote each key last: a fresh object per write, so an undo can tell its
 * own write from a later one with an equal value (R32-03).
 * @type {Map<string, object>}
 */
const _writer = new Map()

/**
 * Register a value in the app-global context. Last write for a key wins.
 * @param {string} key
 * @param {unknown} value
 * @returns {void}
 */
export const provide = (key, value) => {
  _ctx.set(key, value)
  _writer.set(key, {})
}

/**
 * Read a value from the app-global context.
 * @template [T=unknown]
 * @param {string} key
 * @param {T} [fallback] returned when the key is missing or set to null/undefined
 * @returns {T}
 */
export const inject = (key, fallback) => /** @type {T} */ (_ctx.get(key) ?? fallback)

/** Empty the context. Called by destroy(). */
export const clearContext = () => {
  _ctx.clear()
  _writer.clear()
}

/**
 * provide() that can be undone: the returned function puts the key back as it
 * was, unless something has written or cleared it since, even with an equal
 * value (C-74, T22, R32-03).
 * @param {string} key
 * @param {unknown} value
 * @returns {() => void}
 */
export function provideUndoable(key, value) {
  const had = _ctx.has(key)
  const previous = _ctx.get(key)
  const previousWriter = _writer.get(key)
  const mine = {}
  _ctx.set(key, value)
  _writer.set(key, mine)
  return () => {
    if (_writer.get(key) !== mine) return
    if (had) {
      _ctx.set(key, previous)
      _writer.set(key, /** @type {object} */ (previousWriter))
    } else {
      _ctx.delete(key)
      _writer.delete(key)
    }
  }
}

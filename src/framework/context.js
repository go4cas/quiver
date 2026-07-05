/** @type {Map<string, unknown>} */
const _ctx = new Map()

/**
 * Register a value in the app-global context. Last write for a key wins.
 * @param {string} key
 * @param {unknown} value
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

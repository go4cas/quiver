import { reactive, onCleanup } from '@arrow-js/core'

/**
 * @template T
 * @typedef {object} Serializer
 * @property {(raw: string) => T} read
 * @property {(value: T) => string} write
 */

/**
 * @template T
 * @typedef {object} UseStorageOptions
 * @property {'local' | 'session'} [storage]  which Web Storage area to use; default `'local'`
 * @property {Serializer<T>} [serializer]  how values become strings; default JSON
 */

/**
 * @template T
 * @typedef {object} UseStorageReturn
 * @property {() => T} value  the stored value, or `initial` when the key is unset or unreadable
 * @property {(value: T) => void} set  stores a value
 * @property {() => void} remove  removes the key; `value()` goes back to `initial`
 * @property {() => void} stop  stops following changes from other tabs; idempotent
 */

/**
 * A value kept in `localStorage` or `sessionStorage` under `key`, reactive and synced
 * across tabs through the `storage` event. When the storage is missing or throws
 * (a non-browser runtime, private mode, blocked storage, a full quota), the value
 * lives in memory instead. Inside a `component()`, cross-tab syncing stops when the
 * component unmounts.
 *
 * @template T
 * @param {string} key
 * @param {T} initial  returned while the key is unset, and after `remove()`
 * @param {UseStorageOptions<T>} [options]
 * @returns {UseStorageReturn<T>}
 */
export function useStorage(key, initial, options = {}) {
  const { storage = 'local', serializer = /** @type {Serializer<T>} */ (JSON_SERIALIZER) } = options
  const area = storageArea(storage)

  // The value is kept raw and a counter drives reactivity, so value() never
  // returns a reactive proxy of a stored object (TECH-SPEC U-6).
  const state = reactive({ version: 0 })
  let current = read(area ? safe(() => area.getItem(key), null) : null)

  /** @param {string | null} raw */
  function read(raw) {
    return raw === null ? initial : safe(() => serializer.read(raw), initial)
  }

  /** @param {T} value */
  function update(value) {
    current = value
    state.version++
  }

  /** @param {T} value */
  function set(value) {
    update(value)
    if (area) safe(() => area.setItem(key, serializer.write(value)), undefined)
  }

  function remove() {
    update(initial)
    if (area) safe(() => area.removeItem(key), undefined)
  }

  /** @param {StorageEvent} event */
  function onStorage(event) {
    // key === null means another tab called clear().
    if (event.storageArea !== area || (event.key !== null && event.key !== key)) return
    update(read(event.key === null ? null : event.newValue))
  }

  const win = area && typeof window !== 'undefined' ? window : null
  win?.addEventListener('storage', onStorage)

  function stop() {
    win?.removeEventListener('storage', onStorage)
  }

  // onCleanup throws outside a component (U-5).
  try { onCleanup(stop) } catch {}

  return {
    value: () => (state.version, current),
    set,
    remove,
    stop,
  }
}

const JSON_SERIALIZER = { read: JSON.parse, write: JSON.stringify }

/**
 * The storage area, or null when it is missing or unusable. Reading
 * `window.localStorage` itself throws when storage is blocked.
 * @param {'local' | 'session'} which
 * @returns {Storage | null}
 */
function storageArea(which) {
  return safe(() => {
    const area = /** @type {Storage | undefined} */ (/** @type {any} */ (globalThis)[`${which}Storage`])
    if (!area) return null
    const probe = '__arrow-use__'
    area.setItem(probe, probe)
    area.removeItem(probe)
    return area
  }, null)
}

/**
 * @template R, F
 * @param {() => R} fn
 * @param {F} fallback
 * @returns {R | F}
 */
function safe(fn, fallback) {
  try {
    return fn()
  } catch {
    return fallback
  }
}

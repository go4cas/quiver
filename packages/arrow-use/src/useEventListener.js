import { onCleanup } from '@arrow-js/core'

/**
 * @typedef {EventTarget | (() => EventTarget | null | undefined) | null | undefined} ListenerTarget
 *   an event target, or a function returning one. A function is called once, at call
 *   time; if it returns nothing or throws (`() => window` outside a browser), no
 *   listener is added.
 */

/**
 * @typedef {object} UseEventListenerReturn
 * @property {() => void} stop  removes the listener; idempotent
 */

/**
 * Adds an event listener and removes it again on `stop()`, or when the
 * surrounding `component()` unmounts.
 *
 * @param {ListenerTarget} target
 * @param {string} type  the event type, e.g. `'keydown'`
 * @param {(event: Event) => void} handler
 * @param {AddEventListenerOptions} [options]  passed to `addEventListener`; default `{}`
 * @returns {UseEventListenerReturn}
 */
export function useEventListener(target, type, handler, options = {}) {
  /** @type {EventTarget | null | undefined} */
  let el = null
  try {
    el = typeof target === 'function' ? target() : target
  } catch {}
  if (el && typeof el.addEventListener !== 'function') el = null

  el?.addEventListener(type, handler, options)

  function stop() {
    // `capture` must match for removeEventListener to find the listener.
    el?.removeEventListener(type, handler, options)
    el = null
  }

  // onCleanup throws outside a component (U-5).
  try { onCleanup(stop) } catch {}

  return { stop }
}

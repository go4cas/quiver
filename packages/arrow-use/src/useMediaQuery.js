import { reactive, onCleanup } from '@arrow-js/core'

/**
 * @typedef {object} UseMediaQueryReturn
 * @property {() => boolean} matches  whether the query matches now; `false` without `matchMedia`
 * @property {() => void} stop  stops following changes; idempotent
 */

/**
 * Whether a CSS media query matches, kept up to date as it changes. Inside a
 * `component()`, it stops following changes when the component unmounts.
 *
 * @param {string} query  a media query, e.g. `'(prefers-color-scheme: dark)'`
 * @returns {UseMediaQueryReturn}
 */
export function useMediaQuery(query) {
  const list = typeof matchMedia === 'function' ? matchMedia(query) : null
  const state = reactive({ matches: list ? list.matches : false })

  /** @param {MediaQueryListEvent} event */
  function onChange(event) {
    state.matches = event.matches
  }

  list?.addEventListener('change', onChange)

  function stop() {
    list?.removeEventListener('change', onChange)
  }

  // onCleanup throws outside a component (U-5).
  try { onCleanup(stop) } catch {}

  return {
    matches: () => state.matches,
    stop,
  }
}

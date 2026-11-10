import { watch } from '@arrow-js/core'

// Stop functions for any watchers created by the current page's useMeta() call.
// Cleared and replaced on each navigation so stale watchers don't accumulate.
/** @type {Array<() => void>} */
let activeStops = []

/** @typedef {string | (() => string)} MetaValue */

// Stops any watchers registered by the previous page's useMeta() call.
// The router calls this on every navigation, so reactive titles never
// leak onto pages that don't use useMeta themselves.
export function clearMeta() {
  activeStops.forEach((stop) => stop())
  activeStops = []
}

// useMeta({ title, description }) — call at the top of any page function.
// Pass static strings for one-shot assignment, or arrow functions for reactive updates.
/** @param {{ title?: MetaValue, description?: MetaValue }} [config] */
export function useMeta({ title, description } = {}) {
  clearMeta()

  if (title) {
    if (typeof title === 'function') {
      const [, stop] = watch(() => { document.title = title() })
      activeStops.push(stop)
    } else {
      document.title = title
    }
  }

  if (description) {
    let meta = document.querySelector('meta[name="description"]')
    if (!meta) {
      meta = document.createElement('meta')
      meta.setAttribute('name', 'description')
      document.head.appendChild(meta)
    }
    if (typeof description === 'function') {
      const [, stop] = watch(() => { meta.setAttribute('content', description()) })
      activeStops.push(stop)
    } else {
      meta.setAttribute('content', description)
    }
  }
}
